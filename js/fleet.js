document.addEventListener("DOMContentLoaded", function () {
loadVehicles("homeFleetGrid", 2);
loadVehicles("fullFleetGrid");
});

async function loadVehicles(containerId, limit = null) {
const container = document.getElementById(containerId);
if (!container) return;

container.innerHTML = "<p>Loading available vehicles...</p>";
try {
    const { data, error } = await supabaseClient
        .from("available_vehicles")
        .select("driver_id, vehicle_type, vehicle_photo_path");
    if (error) throw error;
    if (!data || data.length === 0) {
        container.innerHTML = `
            <p class="fleet-empty">
                No vehicles are currently available.
                Please check back soon.
            </p>
        `;
        return;
    }
    const vehicles = limit ? data.slice(0, limit) : data;
    container.innerHTML = "";
    vehicles.forEach(vehicle => {
        const card = document.createElement("div");
        card.className = containerId === "homeFleetGrid"
            ? "fleet-card"
            : "vehicle-card";
        const heading = document.createElement("h3");
        heading.textContent = vehicle.vehicle_type || "Available Vehicle";
        card.appendChild(heading);
        if (vehicle.vehicle_photo_path) {
            const { data: imageData } = supabaseClient
                .storage
                .from("vehicle-photos")
                .getPublicUrl(vehicle.vehicle_photo_path);
            const image = document.createElement("img");
            image.src = imageData.publicUrl;
            image.alt = vehicle.vehicle_type || "Vehicle";
            image.loading = "lazy";
            const imageWrapper = document.createElement("div");
            imageWrapper.className = "vehicle-image";
            imageWrapper.appendChild(image);
            card.appendChild(imageWrapper);
        }
        const description = document.createElement("p");
        description.textContent =
            "Comfortable and reliable transportation for your journeys across Ekiti.";
        card.appendChild(description);
        const button = document.createElement("a");
        button.href = "book.html?vehicle=" +
            encodeURIComponent(vehicle.vehicle_type || "");
        button.className = "fleet-btn";
        button.textContent = "Book Now";
        card.appendChild(button);
        container.appendChild(card);
    });
} catch (error) {
    console.error("Fleet loading error:", error);
    container.innerHTML = `
        <p>We couldn't load the vehicles right now.
        Please try again later.</p>
    `;
}

}