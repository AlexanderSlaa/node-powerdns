import {Client} from "../src"

const {zones} = new Client({
    baseUrl: 'http://127.0.0.1:8081',
    apiKey: process.env.POWERDNS_API_KEY!,
    version: '/api/v1',
})


async function main() {
    const zone_list = await zones().list()
    console.table(zone_list, ['name', 'kind', 'dnssec', 'serial']);
}

main().catch(console.error);

