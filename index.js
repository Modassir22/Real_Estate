if(process.env.NODE_ENV != "production"){
    require('dotenv').config()
}
const express = require("express");
const app = express();
const port = 8080;
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const ExpressError = require("./utils/ExpressError.js");
const wrapAsync = require("./utils/wrapAsync.js");
const { listingSchema } = require("./schema.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const { wrap } = require("module");
const { isLoggedIn } = require("./middleware.js");

//middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("js", express.static(path.join(__dirname, "public/js")));

let MongoUrl = process.env.MONGO_URI;

const store = MongoStore.create({
  mongoUrl:MongoUrl,
  crypto:{
    secret:process.env.SECRET
  },
  touchAfter: 24*3600,
})

store.on("error",()=>{
  console.log("Error Occured in MONGO Store", err);
})

const sessionOption = {
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOption));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});


const validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(404, errMsg);
  } else {
    next();
  }
};

//DataBase connection

async function main() {
  mongoose.connect(MongoUrl);
}

main()
  .then((res) => {
    console.log("successfully Connected");
  })
  .catch((err) => {
    console.log("error Occured");
  });

app.get(
  "/",
  wrapAsync(async (req, res) => {
    let data = await Listing.find({});
    res.render("listings/index.ejs", { data });
  })
);

app.get("/about", (req, res) => {
  res.render("listings/about.ejs");
});

app.get("/listings/new", isLoggedIn, (req, res, next) => {
  res.render("listings/new.ejs");
});

//search ke liye
app.post(
  "/listings/search",
  wrapAsync(async (req, res) => {
      let { location, property, price } = req.body;
      let search = await Listing.find({ location, price });
      res.render("listings/search.ejs", { search });
  })
);

//Add new listing
app.post(
  "/listings",
  isLoggedIn,
  validateListing,
  wrapAsync(async (req, res, next) => {
    let newListing = new Listing({ ...req.body.listing });
    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
  })
);

//Read Listing- show data
app.get(
  "/listings",
  wrapAsync(async (req, res) => {
    let allData = await Listing.find({});
    if (!allData) {
      req.flash("error", "Listing trying to Requested doesn't exist!");
      res.redirect("/listings");
    }
    res.render("listings/listing.ejs", { allData });
  })
);

//detail routes
app.get(
  "/listings/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    res.render("listings/detail.ejs", { listing });
  })
);

//Edit- edit Route
app.get(
  "/listings/:id/edit",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
  })
);

//Update route
app.put(
  "/listings/:id",
  isLoggedIn,
  validateListing,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    req.flash("success", "Listing Updated!");
    res.redirect("/listings");
  })
);

//delete Routes
app.delete(
  "/listings/:id",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
  })
);

//signup
app.get("/signup", (req, res) => {
  res.render("user/signup.ejs");
});

app.post(
  "/signup",
  wrapAsync(async (req, res, next) => {
    try {
      let { username, email, password } = req.body;
      let newUser = new User({ username, email });
      let registeredUser = await User.register(newUser, password);
      req.login(registeredUser, (err) => {
        if (err) {
          next(err);
        }
        req.flash("success", "Successfully Login!");
        res.redirect("/listings");
      });
    } catch (e) {
      req.flash("error", e.message);
      res.redirect("/listings");
    }
  })
);

//login route
app.get("/login", (req, res) => {
  res.render("user/login.ejs");
});

//login with account
app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (req, res) => {
    req.flash("success", "SuccessFully Login!");
    res.redirect("/listings");
  }
);

//logout route
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      next(err);
    }
    req.flash("success", "SuccessFully Logout!");
    res.redirect("/listings");
  });
});

app.all("*", (req, res, next) => {
  next(new ExpressError("404", "Page Not Found!"));
});

app.use((err, req, res, next) => {
  let { statusCode = 505, message = "SomeThing Went Wrong" } = err;
  res.render("error.ejs", { err, statusCode });
});

app.listen(port, () => {
  console.log("server is running");
});
