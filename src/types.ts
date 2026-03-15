/**
 * Supported PowerDNS API version prefixes exposed by this package.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/
 */
export const Versions = ['/api/v1'] as const;

/**
 * Supported PowerDNS API version literal.
 */
export type Version = (typeof Versions)[number];

/**
 * Standard PowerDNS API error payload.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/
 */
export type Error = {
	error: string;
	errors?: string[];
};

/**
 * PowerDNS server description returned from `/servers`.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/server.html
 */
export type Server = {
	type: 'Server';
	id: string;
	daemon_type: string;
	version: string;
	url: string;
	config_url: string;
	zones_url: string;
	autoprimaries_url?: string;
	tsigkeys_url?: string;
	statistics_url?: string;
};

/**
 * Zone kinds accepted by the PowerDNS API.
 *
 * PowerDNS still uses `Master` and `Slave` on the wire, so this enum keeps both
 * the modern aliases and the raw API values.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/zone.html
 */
export enum ZoneType {
	Native = 'Native',
	Primary = 'Master',
	Secondary = 'Slave',
	Producer = 'Producer',
	Consumer = 'Consumer',
	Master = 'Master',
	Slave = 'Slave'
}

/**
 * Zone summary payload returned by the zone list endpoint.
 *
 * `rrsets` are omitted from this shape, and `dnssec` / `edited_serial` may
 * also be omitted when the upstream `dnssec=false` query flag is used.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/zone.html
 */
export type ZoneSummary = {
	id: string;
	name: string;
	url: string;
	kind: ZoneType;
	serial: number;
	notified_serial: number;
	edited_serial?: number;
	masters: string[];
	dnssec?: boolean;
	catalog?: string;
	account: string;
	last_check?: number;
};

/**
 * Full zone payload returned by zone detail and create endpoints.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/zone.html
 */
export type Zone = ZoneSummary & {
	type?: 'Zone';
	rrsets?: RRSet[];
	nsec3param?: string;
	nsec3narrow?: boolean;
	presigned?: boolean;
	soa_edit?: string;
	soa_edit_api?: string;
	api_rectify?: boolean;
	zone?: string;
	nameservers?: string[];
	master_tsig_key_ids?: string[];
	slave_tsig_key_ids?: string[];
};

/**
 * Payload used to create a zone.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/zone.html
 */
export type ZoneCreateRequest = {
	name: string;
	kind: ZoneType;
	masters?: string[];
	account?: string;
	nameservers?: string[];
	zone?: string;
	catalog?: string;
	dnssec?: boolean;
	nsec3param?: string;
	soa_edit?: string;
	soa_edit_api?: string;
	api_rectify?: boolean;
	master_tsig_key_ids?: string[];
	slave_tsig_key_ids?: string[];
	rrsets?: RRSet[];
};

/**
 * Payload used to update an existing zone.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/zone.html
 */
export type ZoneUpdateRequest = {
	kind?: ZoneType;
	masters?: string[];
	catalog?: string;
	account?: string;
	soa_edit?: string;
	soa_edit_api?: string;
	api_rectify?: boolean;
	dnssec?: boolean;
	nsec3param?: string;
};

/**
 * RRSet patch payload used by the PowerDNS zone API.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/zone.html
 */
export type RRSet = {
	name: string;
	type: string;
	ttl: number;
	changetype?: 'REPLACE' | 'DELETE' | 'EXTEND' | 'PRUNE';
	records: Record[];
	comments?: Comment[];
};

/**
 * DNS record entry inside an RRSet.
 */
export type Record = {
	content: string;
	disabled: boolean;
	modified_at?: number;
};

/**
 * PowerDNS comment attached to an RRSet.
 */
export type Comment = {
	content?: string;
	account?: string;
	modified_at?: number;
};

/**
 * DNSSEC cryptokey returned by the PowerDNS API.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/cryptokey.html
 */
export type Cryptokey = {
	type: 'Cryptokey';
	id: number;
	keytype: string;
	active: boolean;
	published: boolean;
	dnskey: string;
	ds: string[];
	cds: string[];
	privatekey: string;
	algorithm: string;
	bits: number;
};

/**
 * Payload used to create a cryptokey.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/cryptokey.html
 */
export type CryptokeyCreateRequest = Partial<{
	keytype: 'ksk' | 'zsk';
	active: boolean;
	published: boolean;
	content: string | null;
	bits: number | null;
	algo: string | null;
}>;

/**
 * List of configured views.
 */
export type ViewList = {
	views: string[];
};

/**
 * Zones assigned to a specific view.
 */
export type View = {
	zones: string[];
};

/**
 * Payload used to add a zone to a view.
 */
export type ViewZoneInput = {
	name: string;
};

/**
 * Network-to-view mapping entry.
 */
export type Network = {
	network: string;
	view: string;
};

/**
 * Collection of PowerDNS network mappings.
 */
export type NetworkList = {
	networks: Network[];
};

/**
 * Payload used to set the view for a network.
 */
export type NetworkUpdateRequest = {
	view: string;
};

/**
 * Zone metadata payload.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/metadata.html
 */
export type Metadata = {
	kind: string;
	metadata: string[];
};

/**
 * TSIG key payload.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/tsigkey.html
 */
export type TSIGKey = {
	name: string;
	id: string;
	algorithm: string;
	key: string;
	type: 'TSIGKey';
};

/**
 * Autoprimary payload.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/autoprimary.html
 */
export type Autoprimary = {
	ip: string;
	nameserver: string;
	account: string;
};

/**
 * Search hit returned by `/search-data`.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/search.html
 */
export type SearchResult = {
	content: string;
	disabled: boolean;
	name: string;
	object_type: 'record' | 'zone' | 'comment';
	zone_id: string;
	zone: string;
	type: string;
	ttl: number;
};

/**
 * Shared base fields for statistic items.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/statistics.html
 */
export interface BaseStatisticItem {
	name: string;
}

/**
 * Scalar statistic item.
 */
export type StatisticItem = BaseStatisticItem & {
	type: 'StatisticItem';
	value: string;
};

/**
 * Simple statistic key-value pair nested inside map and ring statistics.
 */
export type SimpleStatisticItem = {
	name: string;
	value: string;
};

/**
 * Map statistic item.
 */
export type MapStatisticItem = BaseStatisticItem & {
	type: 'MapStatisticItem';
	value: SimpleStatisticItem[];
};

/**
 * Ring statistic item.
 */
export type RingStatisticItem = BaseStatisticItem & {
	type: 'RingStatisticItem';
	size: number;
	value: SimpleStatisticItem[];
};

/**
 * Any statistic payload returned by PowerDNS.
 */
export type Statistic = StatisticItem | MapStatisticItem | RingStatisticItem;

/**
 * Cache flush result payload.
 *
 * @see https://doc.powerdns.com/authoritative/http-api/cache.html
 */
export type CacheFlushResult = {
	count: number;
	result: string;
};

/**
 * PowerDNS configuration setting payload.
 */
export type ConfigSetting = {
	name: string;
	type: 'ConfigSetting' | string;
	value: string;
};
