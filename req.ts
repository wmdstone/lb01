async function main() {
  const loginRes = await fetch("http://127.0.0.1:3000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "janki_app" })
  });
  const token = (await loginRes.json()).token;

  await fetch("http://127.0.0.1:3000/api/categories", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ name: "Frontend Mastery" })
  });
  
  const res = await fetch("http://127.0.0.1:3000/api/categories");
  console.log(await res.text());
}
main();
