import { useParams } from 'react-router-dom';

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Team: {id}</h1>
      <p className="text-gray-400">Team details will go here.</p>
    </div>
  );
}
