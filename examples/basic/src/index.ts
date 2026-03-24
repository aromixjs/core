// import { make } from "@aromix/core";
// import { serve } from "@aromix/node";
// import { UserGroup } from "./user/user.group";

import { createServer } from "http";
import { TLSSocket } from "tls";

// const app = make({
//   groups: [UserGroup],
//   plugins: [],
// });

// serve(app).listen(3000, () => {
//   console.log("App is running on port 3000");
// });


createServer((req, res) => {
  const protocol = req.socket instanceof TLSSocket ? 'https' : 'http';
  const fullUrl = new URL(req.url!, `${protocol}://${req.headers.host}`);

  console.log(fullUrl.href);       
  console.log(fullUrl.pathname);   
  console.log(fullUrl.searchParams); 

  res.end('ok');
}).listen(8080);