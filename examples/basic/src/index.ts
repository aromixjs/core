import { make } from "@aromix/core";
import { serve } from "@aromix/node";
import { view } from "./view";

const app = make({
  plugins: [view()],
});

serve(app).listen(3000, () => {
  console.log("App is running on port 3000");
});
