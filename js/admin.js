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

let adminUser = null;


// ==========================================
// MESSAGE HANDLER
// ==========================================

function showMessage(message, success = false) {
    adminMessage.textContent = message;
    adminMessage.style.color = success ? "#0c5f33" : "#b42318";
    adminMessage.style.background = success ? "#eaf6ed" : "#fff0ef";
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

        showMessage(
            "Access denied. This account is not authorised as an admin."
        );

        return false;
    }

    adminUser = user;

    loginSection.style.display = "none";
    dashboard.style.display = "block";
    logoutBtn.style.display = "block";

    await loadApplications();

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

        if (error) {
            throw error;
        }

        await verifyAdmin(data.user);

    } catch (error) {

        showMessage(error.message);

    } finally {

        loginButton.disabled = false;
        loginButton.textContent = "Login";

    }

});


// ==========================================
// LOAD APPLICATIONS
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

    if (!path) {
        return null;
    }

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

    if (!path) {
        return null;
    }

    const { data } = supabaseClient.storage
        .from("vehicle-photos")
        .getPublicUrl(path);

    return data.publicUrl;
}


// ==========================================
// DISPLAY APPLICATION CARD
// ==========================================

async function displayApplication(app) {

    // Retrieve private documents
    const licenseLink = await getDocumentLink(
        app.drivers_license_path
    );

    const vehicleDocumentLink = await getDocumentLink(
        app.vehicle_document_path
    );

    // Retrieve public vehicle photograph
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

            <p>
                <strong>Email:</strong>
                ${escapeHTML(app.email)}
            </p>

            <p>
                <strong>Phone:</strong>
                ${escapeHTML(app.phone)}
            </p>

            <p>
                <strong>Vehicle:</strong>
                ${escapeHTML(app.vehicle_type)}
            </p>

            <p>
                <strong>Plate Number:</strong>
                ${escapeHTML(app.plate_number)}
            </p>

            <p>
                <strong>Submitted:</strong>
                ${escapeHTML(
                    new Date(app.created_at).toLocaleString()
                )}
            </p>

        </div>

        <h4>Vehicle Photograph</h4>

        ${
            vehiclePhotoLink
                ? `
                    <img
                        src="${escapeHTML(vehiclePhotoLink)}"
                        alt="Vehicle submitted by ${escapeHTML(app.full_name)}"
                        style="
                            width:100%;
                            max-width:350px;
                            height:200px;
                            object-fit:cover;
                            border-radius:10px;
                            margin-bottom:15px;
                        "
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

                        <button
                            class="action-button approve-button"
                            data-action="approve"
                        >
                            Approve Driver & Vehicle
                        </button>

                        <button
                            class="action-button reject-button"
                            data-action="reject"
                        >
                            Reject Application
                        </button>

                    </div>
                `
                : ""
        }

    `;

    const approveButton = card.querySelector(
        '[data-action="approve"]'
    );

    const rejectButton = card.querySelector(
        '[data-action="reject"]'
    );

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
        `Are you sure you want to ${decision.toLowerCase()} this driver and vehicle application?`
    );

    if (!confirmed) {
        return;
    }

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

        if (error) {
            throw error;
        }

        showMessage(
            `Application successfully ${decision.toLowerCase()}.`,
            true
        );

        await loadApplications();

    } catch (error) {

        console.error("Application review error:", error);

        showMessage(error.message);

        approveButton.disabled = false;
        rejectButton.disabled = false;

    }

}


// ==========================================
// FILTER APPLICATIONS
// ==========================================

statusFilter.addEventListener("change", loadApplications);


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