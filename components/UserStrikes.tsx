// frontend/app/components/UserStrikes.tsx
'use client'
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Strike {
  id: number; // Use number for strike ID
  description: string;
  date: string;
}
const UserStrikes = () => {
  const [strikes, setStrikes] = useState<Strike[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchStrikes = async () => {
      if (status === 'authenticated') {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
            credentials: 'include',
          });

          if (!response.ok) {
            const errorData = await response.json();
            setError(errorData.detail || 'Failed to fetch strikes');
            return;
          }

          const data: Strike[] = await response.json();
          setStrikes(data);
        } catch (error) {
          setError(error.message || 'An unexpected error occurred');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStrikes();
  }, [status]);

  if (loading) {
    return <div>Loading strikes...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  if (!strikes) {
    return <div>No strikes found.</div>;
  }

  return (
    <div>
      <h1>Your Strikes</h1>
      <ul>
        {strikes.map((strike) => (
          <li key={strike.id}>
            {strike.description} ({strike.date})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserStrikes;