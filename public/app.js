let home = document.querySelector(".home");
let about = document.querySelector(".about");
let allListing = document.querySelector(".all-listing");
let newListing = document.querySelector(".new-listing");

home.addEventListener("click", ()=>{
    window.location.href="/";
})

about.addEventListener("click", ()=>{
    window.location.href = "/about"
})

newListing.addEventListener("click", ()=>{
    window.location.href = "listings/new"
})

let login = document.querySelector(".nav_btn");
login.addEventListener("click",()=>{
    console.log("hello")
})


setTimeout(() => {
  const alerts = document.querySelectorAll('.flash');
  alerts.forEach(alert => {
    // Bootstrap dismiss
    let alertInstance = bootstrap.Alert.getOrCreateInstance(alert);
    alertInstance.close();
  });
}, 2000); 
