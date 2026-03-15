import { Client } from '../src';

const client = new Client({
	baseUrl: 'http://127.0.0.1:8081',
	apiKey: process.env.POWERDNS_API_KEY!
});

async function main() {
	await client
		.zones()
		.rrset({ id: 'example.org.' }, { name: 'www.example.org.', type: 'A' })
		.delete();

	console.log('Record deleted');
}

main().catch(console.error);
