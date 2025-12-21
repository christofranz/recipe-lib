export async function authenticatedFetch(url: string, options: any, logoutFn: () => void) {
    const response = await fetch(url, options);

    if (response.status === 401) {
        console.warn("Token abgelaufen oder ungültig. Logge aus...");
        logoutFn(); // Kickt den User zum Login
        throw new Error("Session abgelaufen");
    }

    return response;
}