async function test() {
  const result = await fetch("http://localhost:3000/api/notebooks/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: "uijJSh4AeE8", password: "" })
  });
  console.log(await result.json());
}
test();
