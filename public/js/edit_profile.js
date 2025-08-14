$(document).ready(function() {
    const usernameInput = document.querySelector("#username_change");
    const editButton = document.querySelector("#submit-button");
    const errorMessage = document.querySelector("#error-msg");

    const currentUser = document.querySelector("#currentUser").value;
    const currentEmail = document.querySelector("#currentEmail").value;

    const emailInput = document.querySelector("#email");

    usernameInput.addEventListener("keyup", async function (e) {
        console.log(currentUser)
        if (usernameInput.value !== currentUser) {
            try {
                const response = await (await fetch('/profiles/checkUsernameExist/' + usernameInput.value, {
                    method: "GET",
                })).json();
                
                if (response.valid !== true) {
                    editButton.disabled = true;
                    errorMessage.innerHTML = "Username already exist!";
                    usernameInput.style.backgroundColor = "Pink";
                }
                else {
                    editButton.disabled = false;
                    errorMessage.innerHTML = "";
                    usernameInput.style.backgroundColor = "white";
                }
            } catch (err) {
                console.log(err);
            }
        }
        
        
    });

    emailInput.addEventListener("keyup", async function (e) {
        if (emailInput.value !== currentEmail) {
            try {
                const response = await (await fetch('/profiles/checkEmailExist/' + emailInput.value, {
                    method: "GET",
                })).json();
                
                if (response.valid !== true) {
                    editButton.disabled = true;
                    errorMessage.innerHTML = "Username already exist!";
                    emailInput.style.backgroundColor = "Pink";
                }
                else {
                    editButton.disabled = false;
                    errorMessage.innerHTML = "";
                    emailInput.style.backgroundColor = "white";
                }
            } catch (err) {
                console.log(err);
            }
        }
    });


    const modal = document.getElementById("reauth-modal");
    const span = document.getElementsByClassName("close")[0];
    const reauthConfirmButton = document.getElementById("reauth-confirm-button");
    const reauthPasswordInput = document.getElementById("reauth-password");
    const reauthErrorMsg = document.getElementById("reauth-error-msg");
    const editForm = document.getElementById("form-edit");

    $("#submit-button").click((e) => {
        e.preventDefault();

        // Check if the password reuse error message is displayed
        const passwordReuseErrorDiv = document.getElementById("password-reuse-error");
        if (passwordReuseErrorDiv && passwordReuseErrorDiv.style.display !== "none") {
            // If the error is displayed, prevent reauthentication modal and form submission
            return false;
        }

        let new_username = $("input#username_change").val();
        let new_email = $("input#email").val();
        let new_password = $("input#password_change").val();
        let new_profile = $("input#profile").val();
        let new_background = $("input#background").val();
    
        if (!new_username && !new_email && !new_password && !new_profile && !new_background) {
            alert("At least one field must be answered");
            return false;
        }

        if (new_email) {
            if (!validateEmail(new_email)) {
                alert("email must be valid");
                return false;
            }
        }

        modal.style.display = "block";
    });

    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    reauthConfirmButton.onclick = async function() {
        const password = reauthPasswordInput.value;
        try {
            const response = await(await fetch('/profiles/reauthenticate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: password })
            })).json();

            if (response.success) {
                editForm.submit();
                editForm.action = "/profiles/edit-profile";
            } else {
                reauthErrorMsg.innerHTML = "Incorrect password.";
            }
        } catch (err) {
            console.log(err);
            reauthErrorMsg.innerHTML = "An error occurred.";
        }
    }

    function validateEmail(email) {
        return email.toLowerCase().match(
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          );
    }
});