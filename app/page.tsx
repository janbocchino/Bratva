'use client';

import { User } from '@/domain/aggregates/user';
import { UserDisplayName, UserEmail } from '@/domain/values/user';
import { createUser } from '@/lib/server/actions/create-user';
import { useState } from 'react';

export default function Home() {
	const [user, setUser] = useState<User | null>(null);
	const [displayName, setDisplayName] = useState<UserDisplayName>(
		UserDisplayName(''),
	);
	const [email, setEmail] = useState<UserEmail>(UserEmail(''));

	const handleCreateUser = async () => {
		const u = await createUser({
			displayName,
			email,
		});
		setUser(u);
	};

	return (
		<div className='flex flex-col grow flex-1 items-center justify-center gap-2'>
			<h1>Create Account</h1>
			<form onSubmit={() => handleCreateUser()} className='flex flex-col gap-2'>
				<input
					type='text'
					name='displayName'
					placeholder='Display Name'
					value={displayName}
					onChange={(e) => setDisplayName(UserDisplayName(e.target.value))}
				/>
				<input
					type='email'
					name='email'
					placeholder='Email'
					value={email}
					onChange={(e) => setEmail(UserEmail(e.target.value))}
				/>
				<button type='submit'>Create User</button>
			</form>
			<div className='flex flex-col font-mono'>
				<pre>{JSON.stringify(user, null, 2)}</pre>
			</div>
		</div>
	);
}
