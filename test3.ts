async function main() {
  const res = await fetch("http://127.0.0.1:3000/api/students");
  console.log(await res.text());
}
main();
