// ==========================================
// CAMPUS RIDE - DRIVER PORTAL
// ==========================================

const authSection = document.getElementById("authSection");
const applicationForm = document.getElementById("applicationForm");
const driverMessage = document.getElementById("driverMessage");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;

const MAX_FILE_SIZE = 5 * 1024 * 1024;


// ==========================================
// HELPER FUNCTIONS
// ==========================================

function showMessage(message, success = false) {
    driverMessage.textContent = message;
    driverMessage.style.color = success ? "#0c5f33" : "#c0392b";
    driverMessage.style.background = success ? "#f1f8f3" : "#fff1f0";
}

function setButtonLoading(button, loading, originalText) {
    button.disabled = loading;
    button.textContent = loading ? "Please wait..." : originalText;
}


// ==========================================
// FILE VALIDATION
// ==========================================

function validateFile(file, allowedTypes) {

    if (!file) {
        throw new Error("Please upload all required documents.");
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`${file.name} exceeds tnvjhe 5MB limit.`);
    }

    if (!allowedTypes.includes(file.type)) {
        throw new Error(`Unsupported file format: ${file.name}`);
    }
}


// ==========================================
// UPLOAD FILE TO SUPABASE
// ==========================================

async function uploadDocument(file, folder, bucket = "driver-documents") {

    const extension = file.name.split(".").pop().toLowerCase();

    const filePath = `${currentUser.id}/${folder}_${crypto.randomUUID()}.${extension}`;

    const { error } = await supabaseClient.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

    if (error) {
        throw error;
    }

    return filePath;
}


// ==========================================
// CHECK EXISTING DRIVER APPLICATION
// ==========================================

async function showApplicationForm() {

    authSection.style.display = "none";
    logoutBtn.style.display = "block";

    const { data, error } = await supabaseClient
        .from("driver_applications")
        .select("application_status")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (error) {
        showMessage(error.message);
        return;
    }

    if (data) {

        applicationForm.style.display = "none";

        const status = data.application_status;

        showMessage(
            `Your application has been received. Current status: ${status}.`,
            true
        );

        return;
    }

    applicationForm.style.display = "block";

    showMessage(
        "Welcome! Please complete your driver application.",
        true
    );
}


// ==========================================
// CHECK LOGIN SESSION
// ==========================================

async function checkSession() {

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        showMessage(error.message);
        return;
    }

    if (data.session) {

        currentUser = data.session.user;

        await showApplicationForm();
    }
}


// ==========================================
// DRIVER SIGNUP
// ==========================================

document.getElementById("signupBtn").addEventListener("click", async () => {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        showMessage("Enter your email and password.");
        return;
    }

    if (password.length < 6) {
        showMessage("Password must contain at least 6 characters.");
        return;
    }

    const button = document.getElementById("signupBtn");

    setButtonLoading(button, true, "Create Account");

    try {

        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (error) {
            throw error;
        }

        if (data.session) {

            currentUser = data.user;

            await showApplicationForm();

        } else {

            showMessage(
                "Account created! Check your email to confirm your account. Then log in.",
                true
            );

        }

    } catch (error) {

        showMessage(error.message);

    } finally {

        setButtonLoading(button, false, "Create Account");

    }

});


// ==========================================
// DRIVER LOGIN
// ==========================================

document.getElementById("loginBtn").addEventListener("click", async () => {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        showMessage("Enter your email and password.");
        return;
    }

    const button = document.getElementById("loginBtn");

    setButtonLoading(button, true, "Login");

    try {

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        currentUser = data.user;

        await showApplicationForm();

    } catch (error) {

        showMessage(error.message);

    } finally {

        setButtonLoading(button, false, "Login");

    }

});


// ==========================================
// SUBMIT DRIVER APPLICATION
// ==========================================

applicationForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!currentUser) {
        showMessage("Please log in before submitting your application.");
        return;
    }

    const fullName = document.getElementById("fullName").value.trim();

    const phone = document.getElementById("phone").value.trim();

    const vehicleType = document.getElementById("vehicleType").value;

    const plateNumber = document.getElementById("plateNumber").value.trim();

    const licenseFile = document.getElementById("driversLicense").files[0];

    const vehicleDocument = document.getElementById("vehicleDocument").files[0];

    const vehiclePhoto = document.getElementById("vehiclePhoto").files[0];

    const submitButton = document.getElementById("submitApplication");


    try {

        // Validate personal and vehicle information

        if (!fullName || !phone || !vehicleType || !plateNumber) {

            throw new Error(
                "Please complete all personal and vehicle details."
            );

        }


        // Accepted document formats

        const documentTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        const photoTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];


        // Validate all uploaded files

        validateFile(licenseFile, documentTypes);

        validateFile(vehicleDocument, documentTypes);

        validateFile(vehiclePhoto, photoTypes);


        setButtonLoading(submitButton, true, "Submit Application");

        showMessage("Uploading your documents...");


        // 1. Upload driver's licence to PRIVATE bucket

        const licensePath = await uploadDocument(
            licenseFile,
            "drivers-license",
            "driver-documents"
        );


        // 2. Upload vehicle document to PRIVATE bucket

        const vehicleDocumentPath = await uploadDocument(
            vehicleDocument,
            "vehicle-document",
            "driver-documents"
        );


        // 3. Upload vehicle photo to PUBLIC bucket

        const vehiclePhotoPath = await uploadDocument(
            vehiclePhoto,
            "vehicle-photo",
            "vehicle-photos"
        );


        showMessage(
            "Documents uploaded. Submitting your application..."
        );


        // Save application details in Supabase

        const { error } = await supabaseClient
            .from("driver_applications")
            .insert({

                user_id: currentUser.id,

                full_name: fullName,

                email: currentUser.email,

                phone: phone,

                vehicle_type: vehicleType,

                plate_number: plateNumber,

                drivers_license_path: licensePath,

                vehicle_document_path: vehicleDocumentPath,

                vehicle_photo_path: vehiclePhotoPath,

                application_status: "Pending"

            });


        if (error) {
            throw error;
        }


        // Hide application form after successful submission

        applicationForm.style.display = "none";


        showMessage(
            "Your application has been submitted successfully! Your documents and vehicle details are awaiting admin review.",
            true
        );


    } catch (error) {

        console.error("Application submission error:", error);

        showMessage(
            error.message || "Something went wrong. Please try again."
        );

    } finally {

        setButtonLoading(
            submitButton,
            false,
            "Submit Application"
        );

    }

});


// ==========================================
// DRIVER LOGOUT
// ==========================================

logoutBtn.addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        showMessage(error.message);
        return;
    }

    currentUser = null;

    authSection.style.display = "block";

    applicationForm.style.display = "none";

    logoutBtn.style.display = "none";

    showMessage("You have logged out successfully.", true);

});


// ==========================================
// AUTHENTICATION STATE LISTENER
// ==========================================

supabaseClient.auth.onAuthStateChange((event, session) => {

    if (event === "SIGNED_IN" && session) {
        currentUser = session.user;
    }

    if (event === "SIGNED_OUT") {
        currentUser = null;
    }

});


// ==========================================
// START DRIVER PORTAL
// ==========================================

checkSession();