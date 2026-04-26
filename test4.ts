async function main() {
  const loginRes = await fetch("http://127.0.0.1:3000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "janki_app" })
  });
  const token = (await loginRes.json()).token;

  await fetch("http://127.0.0.1:3000/api/students", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ name: "Bob", bio: "b", photo: "p", assignedGoals: [] })
  });
  const res = await fetch("http://127.0.0.1:3000/api/students");
  console.log(await res.text());
}
main();
