// // Example client component using the secure API proxy
// // dashboard/me
'use client';
import Image from "next/image"

import { auth } from "@/auth"
// import { useEffect } from "react"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
// import { auth } from '@/auth';

// Example User Profile component
export default  function UserProfile() {
  const { status } = useSession();
  // const session = auth()

  // const {user} =  auth()
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    // Only fetch data if user is authenticated
    if (status === 'authenticated') {
      fetchUserData();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Using the proxy API route instead of direct backend access
      // Notice we don't need to handle tokens at all in the client
      const response = await fetch('/api/proxy/user/me');

      if (!response.ok) {
        // Handle errors
        if (response.status === 401) {
          // Handle authentication errors
          throw new Error('Session expired. Please sign in again.');
        } else {
          throw new Error('Failed to fetch user data');
        }
      }

      const data = await response.json();
      setUserData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Example of submitting data
  const updateUserProfile = async (formData) => {
    try {
      setLoading(true);

      const response = await fetch('/api/proxy/user/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedData = await response.json();
      setUserData(updatedData);
      setError(null);

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <div>Please sign in to view your profile
      <p>{status}</p>
    </div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>User Profile</h1>
      {userData && (
        <div>
          <p>Name: {userData.name}</p>
          <p>Email: {userData.email}</p>
          {/* Other profile information */}
          <div>
          </div>
        </div>
      )}

      {/* Example form for updating profile */}
      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = {
          name: e.target.name.value,
          bio: e.target.bio.value,
        };
        updateUserProfile(formData);
      }}>
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            defaultValue={userData?.name || ''}
          />

        </div>
        <div>
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={userData?.bio || ''}
          />
        </div>
        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
}


// export default async function UserAvatar() {
//   const session = await auth()

//   if (!session?.user) return null
//   const { name, image, email } = session.user
//   const [userData, setUserData] = useState(null);

  
//   return (
//     <div>
//       {/* <img src={session.user.image} alt="User Avatar" /> */}
//       <div>
//         <Image src={`${image}`}
//           width={100}
//           height={100}
//           alt="user image"
//         />
//       </div>
//       <p>{name}</p>
//       <p>{email}</p>
//     </div>
//   )
// }