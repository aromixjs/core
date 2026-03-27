import { make } from "@aromix/core";
import { serve } from "@aromix/node";
import { UserGroup } from "./user/user.group";

const app = make({
  groups: [UserGroup],
});

console.log(app);


serve(app).listen(3000, () => {
  console.log("App is running on port 3000");
});
