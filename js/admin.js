// ==========================================
// CAMPUS RIDE - ADMIN DASHBOARD
// ==========================================

const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");

const applicationsList = document.getElementById("applicationsList");
const adminMessage = document.getElementById("adminMessage");
const statusFilter = document.getElementById("statusFilter");

const adminFleetList = document.getElementById("adminFleetList");
const ridesList = document.getElementById("ridesList");

let adminUser = null;


// ==========================================
// MESSAGE HANDLER
// ==========================================

function showMessage(message, success = false) {

    adminMessage.textContent = message;

    adminMessage.style.color = success ? "#0c5f33" : "#b42318";

    adminMessage.style.background = success
        ? "#eaf6ed"
        : "#fff0ef";

}


// ==========================================
// HTML SECURITY
// ==========================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);

}


// ==========================================
// VERIFY ADMIN ACCOUNT
// ==========================================

async function verifyAdmin(user) {

    const { data, error } = await supabaseClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error || !data) {

        await supabaseClient.auth.signOut();

        loginSection.style.display = "block";
        dashboard.style.display = "none";
        logoutBtn.style.display = "none";

        showMessage(
            "Access denied. This account is not authorised as an admin."
        );

        return false;
    }

    adminUser = user;

    loginSection.style.display = "none";
    dashboard.style.display = "block";
    logoutBtn.style.display = "block";

    await loadDashboard();

    return true;

}


// ==========================================
// ADMIN LOGIN
// ==========================================

loginForm.addEventListener("submit", async event => {

    event.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();

    const password = document.getElementById("adminPassword").value;

    const loginButton = document.getElementById("loginBtn");

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        await verifyAdmin(data.user);

    } catch (error) {

        showMessage(error.message);

    } finally {

        loginButton.disabled = false;
        loginButton.textContent = "Login";

    }

});


// ==========================================
// LOAD ALL DASHBOARD DATA
// ==========================================

async function loadDashboard() {

    await Promise.all([
        loadDashboardStats(),
        loadApplications(),
        loadApprovedDrivers(),
        loadRideBookings()
    ]);

}


// ==========================================
// DASHBOARD STATISTICS
// ==========================================

async function loadDashboardStats() {

    try {

        const [
            applicationsResult,
            driversResult,
            ridesResult
        ] = await Promise.all([

            supabaseClient
                .from("driver_applications")
                .select("id", { count: "exact", head: true }),

            supabaseClient
                .from("drivers")
                .select("id", { count: "exact", head: true }),

            supabaseClient
                .from("rides")
                .select("id", { count: "exact", head: true })

        ]);

        if (applicationsResult.error) throw applicationsResult.error;
        if (driversResult.error) throw driversResult.error;
        if (ridesResult.error) throw ridesResult.error;

        document.getElementById("totalApplications").textContent =
            applicationsResult.count ?? 0;

        document.getElementById("totalDrivers").textContent =
            driversResult.count ?? 0;

        document.getElementById("totalRides").textContent =
            ridesResult.count ?? 0;

    } catch (error) {

        console.error("Statistics error:", error);

        showMessage("Unable to load dashboard statistics: " + error.message);

    }

}


// ==========================================
// LOAD DRIVER APPLICATIONS
// ==========================================

async function loadApplications() {

    applicationsList.innerHTML = "<p>Loading applications...</p>";

    const filter = statusFilter.value;

    let query = supabaseClient
        .from("driver_applications")
        .select("*")
        .order("created_at", { ascending: false });

    if (filter !== "All") {

        query = query.eq("application_status", filter);

    }

    const { data, error } = await query;

    if (error) {

        applicationsList.innerHTML = "";

        showMessage(error.message);

        return;

    }

    applicationsList.innerHTML = "";

    if (!data || data.length === 0) {

        applicationsList.innerHTML =
            '<div class="empty-message">No applications found.</div>';

        return;

    }

    for (const application of data) {

        await displayApplication(application);

    }

}


// ==========================================
// PRIVATE DOCUMENT LINKS
// ==========================================

async function getDocumentLink(path) {

    if (!path) return null;

    const { data, error } = await supabaseClient.storage
        .from("driver-documents")
        .createSignedUrl(path, 300);

    if (error) {

        console.error("Document access error:", error.message);

        return null;

    }

    return data.signedUrl;

}


// ==========================================
// PUBLIC VEHICLE PHOTO
// ==========================================

function getVehiclePhoto(path) {

    if (!path) return null;

    const { data } = supabaseClient.storage
        .from("vehicle-photos")
        .getPublicUrl(path);

    return data.publicUrl;

}


// ==========================================
// DISPLAY APPLICATION CARD
// ==========================================

async function displayApplication(app) {

    const licenseLink = await getDocumentLink(
        app.drivers_license_path
    );

    const vehicleDocumentLink = await getDocumentLink(
        app.vehicle_document_path
    );

    const vehiclePhotoLink = getVehiclePhoto(
        app.vehicle_photo_path
    );

    const card = document.createElement("article");

    card.className = "application-card";

    card.innerHTML = `

        <h3>${escapeHTML(app.full_name)}</h3>

        <span class="status">
            ${escapeHTML(app.application_status)}
        </span>

        <div class="application-details">

            <p><strong>Email:</strong> ${escapeHTML(app.email)}</p>

            <p><strong>Phone:</strong> ${escapeHTML(app.phone)}</p>

            <p><strong>Vehicle:</strong> ${escapeHTML(app.vehicle_type)}</p>

            <p><strong>Plate Number:</strong> ${escapeHTML(app.plate_number)}</p>

            <p><strong>Submitted:</strong>
                ${escapeHTML(new Date(app.created_at).toLocaleString())}
            </p>

        </div>

        <h4>Vehicle Photograph</h4>

        ${
            vehiclePhotoLink
            ? `
                <img
                    src="${escapeHTML(vehiclePhotoLink)}"
                    alt="Submitted vehicle"
                    style="width:100%;max-width:350px;height:200px;object-fit:cover;border-radius:10px;"
                >
            `
            : "<p>Vehicle photograph unavailable.</p>"
        }

        <h4>Submitted Documents</h4>

        <div class="document-links">

            ${
                licenseLink
                ? `<a href="${escapeHTML(licenseLink)}" target="_blank" rel="noopener noreferrer">Driver's Licence</a>`
                : "Licence unavailable"
            }

            ${
                vehicleDocumentLink
                ? `<a href="${escapeHTML(vehicleDocumentLink)}" target="_blank" rel="noopener noreferrer">Vehicle Registration</a>`
                : "Vehicle document unavailable"
            }

            ${
                vehiclePhotoLink
                ? `<a href="${escapeHTML(vehiclePhotoLink)}" target="_blank" rel="noopener noreferrer">View Vehicle Photograph</a>`
                : ""
            }

        </div>

        ${
            app.application_status === "Pending"
            ? `
                <div class="action-buttons">

                    <button class="action-button approve-button" data-action="approve">
                        Approve Driver & Vehicle
                    </button>

                    <button class="action-button reject-button" data-action="reject">
                        Reject Application
                    </button>

                </div>
            `
            : ""
        }

    `;

    const approveButton = card.querySelector('[data-action="approve"]');

    const rejectButton = card.querySelector('[data-action="reject"]');

    if (approveButton) {

        approveButton.addEventListener("click", () => {

            reviewApplication(
                app.id,
                "Approved",
                approveButton,
                rejectButton
            );

        });

    }

    if (rejectButton) {

        rejectButton.addEventListener("click", () => {

            reviewApplication(
                app.id,
                "Rejected",
                approveButton,
                rejectButton
            );

        });

    }

    applicationsList.appendChild(card);

}


// ==========================================
// APPROVE OR REJECT APPLICATION
// ==========================================

async function reviewApplication(
    id,
    decision,
    approveButton,
    rejectButton
) {

    const confirmed = confirm(
        `Are you sure you want to ${decision.toLowerCase()} this application?`
    );

    if (!confirmed) return;

    approveButton.disabled = true;
    rejectButton.disabled = true;

    showMessage("Processing application...");

    try {

        const { error } = await supabaseClient.rpc(
            "review_driver_application",
            {
                p_application_id: id,
                p_decision: decision
            }
        );

        if (error) throw error;

        showMessage(
            `Application successfully ${decision.toLowerCase()}.`,
            true
        );

        await loadDashboard();

    } catch (error) {

        console.error(error);

        showMessage(error.message);

        approveButton.disabled = false;
        rejectButton.disabled = false;

    }

}


// ==========================================
// LOAD APPROVED DRIVERS
// ==========================================

async function loadApprovedDrivers() {

    adminFleetList.innerHTML = "<p>Loading approved drivers...</p>";

    const driversSection = document.getElementById("driversSection");

    const existingContainer = driversSection.querySelector("#approvedDriversList");

    let container = existingContainer;

    if (!container) {

        container = document.createElement("div");

        container.id = "approvedDriversList";

        driversSection.appendChild(container);

    }

    container.innerHTML = "<p>Loading drivers...</p>";

    const { data, error } = await supabaseClient
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {

        container.innerHTML = "";

        showMessage("Unable to load approved drivers: " + error.message);

        return;

    }

    container.innerHTML = "";

    if (!data || data.length === 0) {

        container.innerHTML =
            '<div class="empty-message">No approved drivers yet.</div>';

        return;

    }

    for (const driver of data) {

        const card = document.createElement("article");

        card.className = "application-card";

        card.innerHTML = `

            <h3>${escapeHTML(driver.full_name)}</h3>

            <div class="application-details">

                <p><strong>Phone:</strong> ${escapeHTML(driver.phone)}</p>

                <p><strong>Vehicle:</strong> ${escapeHTML(driver.vehicle_type)}</p>

                <p><strong>Plate Number:</strong> ${escapeHTML(driver.plate_number)}</p>

            </div>

            <span class="status" style="background:#eaf6ed;color:#0c5f33;">
                Approved Driver
            </span>

        `;

        container.appendChild(card);

    }

}


// ==========================================
// LOAD FLEET MANAGEMENT
// ==========================================

async function loadFleet() {

    adminFleetList.innerHTML = "<p>Loading fleet...</p>";

    const { data, error } = await supabaseClient
        .from("available_vehicles")
        .select("*");

    if (error) {

        adminFleetList.innerHTML = "";

        showMessage("Unable to load fleet: " + error.message);

        return;

    }

    adminFleetList.innerHTML = "";

    if (!data || data.length === 0) {

        adminFleetList.innerHTML =
            '<div class="empty-message">No approved vehicles available yet.</div>';

        return;

    }

    data.forEach(vehicle => {

        const photo = getVehiclePhoto(vehicle.vehicle_photo_path);

        const card = document.createElement("article");

        card.className = "application-card";

        card.innerHTML = `

            <h3>${escapeHTML(vehicle.vehicle_type)}</h3>

            ${
                photo
                ? `
                    <img
                        src="${escapeHTML(photo)}"
                        alt="Available vehicle"
                        style="width:100%;max-width:350px;height:200px;object-fit:cover;border-radius:10px;"
                    >
                `
                : "<p>No vehicle photograph available.</p>"
            }

            <p style="margin-top:15px;">
                <span class="status" style="background:#eaf6ed;color:#0c5f33;">
                    Available
                </span>
            </p>

        `;

        adminFleetList.appendChild(card);

    });

}


// ==========================================
// LOAD PASSENGER RIDE BOOKINGS
// ==========================================

async function loadRideBookings() {

    ridesList.innerHTML = "<p>Loading ride bookings...</p>";

    const { data, error } = await supabaseClient
        .from("rides")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {

        ridesList.innerHTML = "";

        showMessage("Unable to load ride bookings: " + error.message);

        return;

    }

    ridesList.innerHTML = "";

    if (!data || data.length === 0) {

        ridesList.innerHTML =
            '<div class="empty-message">No ride bookings found.</div>';

        return;

    }

    data.forEach(ride => {

        const card = document.createElement("article");

        card.className = "application-card";

        const currentStatus = String(ride.ride_status || "pending").toLowerCase();

        card.innerHTML = `

            <h3>Ride Booking</h3>

            <div class="application-details">

                <p><strong>Passenger:</strong>
                    ${escapeHTML(ride.passenger_name)}
                </p>

                <p><strong>Phone:</strong>
                    ${escapeHTML(ride.passenger_phone)}
                </p>

                <p><strong>Pickup:</strong>
                    ${escapeHTML(ride.pickup_location)}
                </p>

                <p><strong>Destination:</strong>
                    ${escapeHTML(ride.destination)}
                </p>

                <p><strong>Booked:</strong>
                    ${escapeHTML(new Date(ride.created_at).toLocaleString())}
                </p>

                <p><strong>Current Status:</strong>
                    <span class="status">${escapeHTML(currentStatus)}</span>
                </p>

            </div>

            <div style="margin-top:20px;">

                <label for="ride-status-${escapeHTML(ride.id)}">
                    Update ride status:
                </label>

                <select
                    class="section-filter ride-status-select"
                    id="ride-status-${escapeHTML(ride.id)}"
                >

                    <option value="pending" ${currentStatus === "pending" ? "selected" : ""}>
                        Pending
                    </option>

                    <option value="confirmed" ${currentStatus === "confirmed" ? "selected" : ""}>
                        Confirmed
                    </option>

                    <option value="completed" ${currentStatus === "completed" ? "selected" : ""}>
                        Completed
                    </option>

                    <option value="cancelled" ${currentStatus === "cancelled" ? "selected" : ""}>
                        Cancelled
                    </option>

                </select>

                <button
                    class="action-button approve-button update-ride-btn"
                    style="margin-top:10px;"
                >
                    Update Booking
                </button>

            </div>

        `;

        const select = card.querySelector(".ride-status-select");

        const updateButton = card.querySelector(".update-ride-btn");

        updateButton.addEventListener("click", () => {

            updateRideStatus(
                ride.id,
                select.value,
                updateButton
            );

        });

        ridesList.appendChild(card);

    });

}


// ==========================================
// UPDATE RIDE STATUS
// ==========================================

async function updateRideStatus(id, newStatus, button) {

    if (!confirm(`Change this booking status to ${newStatus}?`)) {
        return;
    }

    button.disabled = true;

    button.textContent = "Updating...";

    try {

        const { error } = await supabaseClient
            .from("rides")
            .update({
                ride_status: newStatus
            })
            .eq("id", id);

        if (error) throw error;

        showMessage("Ride booking updated successfully.", true);

        await loadRideBookings();

        await loadDashboardStats();

    } catch (error) {

        console.error(error);

        showMessage(error.message);

        button.disabled = false;

        button.textContent = "Update Booking";

    }

}


// ==========================================
// FILTER APPLICATIONS
// ==========================================

statusFilter.addEventListener("change", loadApplications);


// ==========================================
// DASHBOARD NAVIGATION
// ==========================================

document.querySelectorAll(".sidebar button").forEach(button => {

    button.addEventListener("click", async () => {

        const section = button.dataset.section;

        if (section === "fleetSection") {

            await loadFleet();

        }

    });

});


// ==========================================
// ADMIN LOGOUT
// ==========================================

logoutBtn.addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {

        showMessage(error.message);

        return;

    }

    adminUser = null;

    dashboard.style.display = "none";

    loginSection.style.display = "block";

    logoutBtn.style.display = "none";

    applicationsList.innerHTML = "";

    ridesList.innerHTML = "";

    adminFleetList.innerHTML = "";

    loginForm.reset();

});


// ==========================================
// CHECK EXISTING ADMIN SESSION
// ==========================================

async function checkAdminSession() {

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {

        showMessage(error.message);

        return;

    }

    if (data.session) {

        await verifyAdmin(data.session.user);

    }

}


// ==========================================
// START ADMIN DASHBOARD
// ==========================================

checkAdminSession();