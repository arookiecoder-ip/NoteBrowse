import { verifyPassword } from "./src/lib/crypto";

async function run() {
  const hash = "scrypt$kdm3tHKsz9AIiQISFKRnnw==$sa7WngmKXPheS+NI5aXNSbmvISbT8sGi9PxzeIauxsS0y+mqGMYWbntF5vAt/pNPqTLjeHFcfvLjpKQA3p/9qQ==";
  const pw1 = "123456";
  const pw2 = "";
  const pw3 = "password";
  
  console.log("pw1", await verifyPassword(pw1, hash));
  console.log("pw2", await verifyPassword(pw2, hash));
  console.log("pw3", await verifyPassword(pw3, hash));
}
run();
