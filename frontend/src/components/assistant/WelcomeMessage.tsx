export function WelcomeMessage({ username }: { username: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-text-muted">
      <p className="text-xl font-medium text-text">Ողջու՛յն, {username} 👋</p>
      <p>Ինչի՞ մասին խոսենք այսօր։</p>
    </div>
  );
}
