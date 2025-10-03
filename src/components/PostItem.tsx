export const PostItem = ({ id, post }: { id: string; post: string }) => {
  return (
    <section key={id} id={`item-${id}`} class="stack sm">
      <p class="m-y none post">{post}</p>
      <button
        type="button"
        class="tertiary w-fit"
        hx-delete={`/post/${id}`}
        hx-target={`#item-${id}`}
        hx-swap="outerHTML transition:true"
      >
        Delete
      </button>
    </section>
  );
};
