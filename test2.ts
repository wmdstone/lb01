async function main() {
  const loginRes = await fetch("http://127.0.0.1:3000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "janki_app" })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const res = await fetch("http://127.0.0.1:3000/api/masterGoals", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ title: "Test Goal", description: "Testing CRUD", categoryId: "test_cat_1", pointValue: 10 })
  });
  console.log("Create Post response:", await res.text());
}
main();
