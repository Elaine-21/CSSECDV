document.addEventListener("DOMContentLoaded", function(event) {
    const usernameInput = document.querySelector("#username");
    const signupButton = document.querySelector("#account");
    const signupError = document.querySelector("#error-msg");

    const emailInput = document.querySelector("#email");

    usernameInput.addEventListener("keyup", async function (e) {
        try {
            const response = await (await fetch('/profiles/checkUsernameExist/' + usernameInput.value, {
                method: "GET",
            })).json();
            
            if (response.valid !== true) {
                signupButton.disabled = true;
                signupError.innerHTML = "Username already exist!";
                usernameInput.style.backgroundColor = "Pink";
            }
            else {
                signupButton.disabled = false;
                signupError.innerHTML = "";
                usernameInput.style.backgroundColor = "white";
            }
        } catch (err) {
            console.log(err);
        }
        
    });

    emailInput.addEventListener("keyup", async function (e) {
        try {
            const response = await (await fetch('/profiles/checkEmailExist/' + emailInput.value, {
                method: "GET",
            })).json();
            
            if (response.valid !== true) {
                signupButton.disabled = true;
                signupError.innerHTML = "Username already exist!";
                emailInput.style.backgroundColor = "Pink";
            }
            else {
                signupButton.disabled = false;
                signupError.innerHTML = "";
                emailInput.style.backgroundColor = "white";
            }
        } catch (err) {
            console.log(err);
        }
        
    });

    document.getElementById('account').addEventListener('click', () => {
        document.getElementById('popupOverlay').style.display = 'flex';
    });

    document.getElementById('closePopup').addEventListener('click', () => {
        document.getElementById('popupOverlay').style.display = 'none';
    });
});
