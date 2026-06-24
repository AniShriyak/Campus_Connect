const url = "https://firestore.googleapis.com/v1/projects/campusconnect-e5b5d/databases/(default)/documents?key=AIzaSyCFCc5z7DTrhBzAinbx5D23hGbnTEF8IwU";

fetch(url)
  .then(res => res.text())
  .then(data => {
    console.log("RESPONSE:", data);
  })
  .catch(err => {
    console.error("NETWORK ERROR:", err);
  });
