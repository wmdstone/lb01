async function main() {
  try {
    const res = await fetch("http://127.0.0.1:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "janki_app" })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (err) {
    console.log("Error:", err);
  }
}
main();
