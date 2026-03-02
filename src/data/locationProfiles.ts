export type LocationProfile = {
  city: string;
  aliases: string[];
  timezone: string;
  longitude: number;
};

const PROFILES: LocationProfile[] = [
  { city: "上海", aliases: ["上海", "shanghai"], timezone: "Asia/Shanghai", longitude: 121.47 },
  { city: "北京", aliases: ["北京", "beijing"], timezone: "Asia/Shanghai", longitude: 116.41 },
  { city: "深圳", aliases: ["深圳", "shenzhen"], timezone: "Asia/Shanghai", longitude: 114.06 },
  { city: "广州", aliases: ["广州", "guangzhou"], timezone: "Asia/Shanghai", longitude: 113.26 },
  { city: "香港", aliases: ["香港", "hong kong", "hk"], timezone: "Asia/Hong_Kong", longitude: 114.17 },
  { city: "台北", aliases: ["台北", "taipei"], timezone: "Asia/Taipei", longitude: 121.56 },
  { city: "东京", aliases: ["东京", "tokyo"], timezone: "Asia/Tokyo", longitude: 139.76 },
  { city: "首尔", aliases: ["首尔", "seoul"], timezone: "Asia/Seoul", longitude: 126.98 },
  {
    city: "新加坡",
    aliases: ["新加坡", "singapore"],
    timezone: "Asia/Singapore",
    longitude: 103.82
  },
  { city: "伦敦", aliases: ["伦敦", "london"], timezone: "Europe/London", longitude: -0.13 },
  { city: "巴黎", aliases: ["巴黎", "paris"], timezone: "Europe/Paris", longitude: 2.35 },
  { city: "柏林", aliases: ["柏林", "berlin"], timezone: "Europe/Berlin", longitude: 13.41 },
  { city: "纽约", aliases: ["纽约", "new york", "nyc"], timezone: "America/New_York", longitude: -74.01 },
  {
    city: "旧金山",
    aliases: ["旧金山", "san francisco", "sf"],
    timezone: "America/Los_Angeles",
    longitude: -122.42
  },
  {
    city: "洛杉矶",
    aliases: ["洛杉矶", "los angeles", "la"],
    timezone: "America/Los_Angeles",
    longitude: -118.24
  },
  {
    city: "芝加哥",
    aliases: ["芝加哥", "chicago"],
    timezone: "America/Chicago",
    longitude: -87.63
  },
  { city: "多伦多", aliases: ["多伦多", "toronto"], timezone: "America/Toronto", longitude: -79.38 },
  { city: "悉尼", aliases: ["悉尼", "sydney"], timezone: "Australia/Sydney", longitude: 151.21 }
];

export function findLocationProfile(city: string): LocationProfile | null {
  const token = city.trim().toLowerCase();
  if (!token) {
    return null;
  }

  const profile = PROFILES.find((item) => item.aliases.some((alias) => token.includes(alias.toLowerCase())));
  return profile || null;
}

export function getDefaultLocationProfile(): LocationProfile {
  return PROFILES[0];
}
