import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { logger } from "hono/logger";
import { Layout } from "../components/Layout.tsx";
import { cache } from "hono/cache";
import { PostItem } from "../components/PostItem.tsx";
import * as v from "@valibot/valibot";
import { vValidator } from "@hono/valibot-validator";

type Post = {
  id: string;
  post: string;
  createdAt: number;
};
const POST_PREFIX = ["post"];

const kvPromise = Deno.openKv();
const app = new Hono();

app.use(logger());
app.use("*", Layout);

// app.get(
//   "/static/:fileName{.+\\.css}",
//   cache({
//     cacheName: "temp-log-static-css",
//     cacheControl: "max-age=604800",
//     wait: true,
//   })
// );
app.get(
  "/static/htmx.min.js",
  cache({
    cacheName: "temp-log-static-htmx",
    cacheControl: "max-age=2592000",
    wait: true,
  })
);

app.use("/static/*", serveStatic({ root: "./" }));

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.render(
    <>
      <h1>500 Internal Server Error</h1>
      <p>Unexpected error occurred</p>
    </>
  );
});

app.notFound((c) => c.render(<h1>404 Not Found</h1>));

async function getPosts(kv: Deno.Kv): Promise<Post[]> {
  const posts: Post[] = [];
  for await (const entry of kv.list<Post>({ prefix: POST_PREFIX })) {
    posts.push(entry.value);
  }
  posts.sort((a, b) => b.createdAt - a.createdAt);
  return posts;
}

app.get("/", async (c) => {
  const kv = await kvPromise;
  const posts = await getPosts(kv);

  return c.render(
    <>
      <form
        hx-post="/post"
        hx-target="#post"
        hx-swap="afterbegin transition:true"
        hx-disabled-elt="find textarea, find button"
        hx-on--after-request="if(event.detail.successful) this.reset()"
      >
        <div class="stack">
          <textarea
            name="post"
            type="text"
            autocomplete="off"
            placeholder="Write your post here"
            rows={4}
            required
          />
          <button type="submit">Submit</button>
        </div>
      </form>
      <div id="post" class="stack lg">
        {posts.map(({ post, id }) => (
          <PostItem id={id} post={post} />
        ))}
      </div>
    </>
  );
});

app.post(
  "/post",
  vValidator(
    "form",
    v.object({
      post: v.pipe(v.string(), v.minLength(1), v.maxLength(10000)),
    })
  ),
  async (c) => {
    const kv = await kvPromise;
    const { post } = c.req.valid("form");
    const newItem: Post = {
      id: crypto.randomUUID(),
      post: post as string,
      createdAt: Date.now(),
    };
    await kv.set([...POST_PREFIX, newItem.id], newItem);
    return c.html(<PostItem id={newItem.id} post={newItem.post} />);
  }
);

app.delete("/post/:id", async (c) => {
  const kv = await kvPromise;
  const id = c.req.param("id");
  await kv.delete([...POST_PREFIX, id]);
  return c.body(null);
});

export default app;
