// load-test.js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20, // 20 utilisateurs virtuels
  duration: "30s", // pendant 30 secondes
};

export default function () {
  const url = "http://localhost:3300/api/auth";

  const payload = JSON.stringify({
    emailOrNumber: "souissi.ons.54@gmail.com",
    password: "123456",
  });

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const res = http.post(url, payload, params);

  check(res, {
    "Connexion réussie (status 200)": (r) => r.status == 200,
  });

  sleep(1);
}
