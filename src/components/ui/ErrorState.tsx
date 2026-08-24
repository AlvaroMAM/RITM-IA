export function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-danger bg-danger/10 p-5 text-danger" role="alert">
      <h2 className="font-bold">{title}</h2>
      <p>{body}</p>
    </div>
  );
}
