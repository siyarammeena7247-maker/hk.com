

document.querySelectorAll(".big-btn").forEach(button => {

    button.addEventListener("click", () => {
        console.log(button.innerText + " Clicked");
    });

});

console.log("Admin Panel Loaded Successfully");





let payments =
JSON.parse(localStorage.getItem("payments")) || [];

let total = 0;

payments.forEach(function(payment){
    total += Number(payment.amount);
});

let totalMoney =
document.getElementById("totalMoney");

if(totalMoney){
    totalMoney.innerText = "₹ " + total.toFixed(2);
}



let withdrawals =
JSON.parse(localStorage.getItem("withdrawals")) || [];

let withdrawTotal = 0;

withdrawals.forEach(function(item){
    withdrawTotal += Number(item.amount);
});

let totalWithdrawal =
document.getElementById("totalWithdrawal");

if(totalWithdrawal){
    totalWithdrawal.innerText =
    "₹ " + withdrawTotal.toFixed(2);
}

// todaytotalplay.html ..............


let plays =
JSON.parse(localStorage.getItem("plays")) || [];

let playTotal = 0;

plays.forEach(function(play){
    playTotal += Number(play.amount);
});

let totalPlay =
document.getElementById("totalPlay");

if(totalPlay){
    totalPlay.innerText =
    "₹ " + playTotal.toFixed(2);
}