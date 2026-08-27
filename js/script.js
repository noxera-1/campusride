const bookingForm = document.getElementById("bookingForm");

if (bookingForm) {

    bookingForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const name = document.getElementById("name").value;

        const phone = document.getElementById("phone").value;

        const pickup = document.getElementById("pickup").value;

        const destination = document.getElementById("destination").value;

        const vehicle = document.getElementById("vehicle").value;

        const rideDate = document.getElementById("rideDate").value;

        const notes = document.getElementById("notes").value;

        const message =

`🚗 CAMPUS RIDE BOOKING

Name: ${name}

Phone: ${phone}

Pickup: ${pickup}

Destination: ${destination}

Vehicle: ${vehicle}

Date/Time: ${rideDate}

Notes: ${notes}`;

        const whatsappURL =

`https://wa.me/2348079164457?text=${encodeURIComponent(message)}`;

        window.open(whatsappURL, "_blank");

    });

}