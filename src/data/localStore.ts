import * as FileSystem from "expo-file-system/legacy";
import { BaziResult, BirthInput } from "../types";

type StoredUser = {
  id: string;
  username: string;
  usernameKey: string;
  password: string;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  username: string;
  createdAt: string;
};

export type SavedReport = {
  id: string;
  userId: string;
  createdAt: string;
  input: BirthInput;
  result: BaziResult;
};

type PersistPayload = {
  users: StoredUser[];
  sessionUserId: string | null;
  reports: SavedReport[];
};

const STORE_FILE_NAME = "bazi_app_local_v1.json";
const STORE_URI = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${STORE_FILE_NAME}` : null;
const MAX_REPORTS_PER_USER = 80;

const EMPTY_PAYLOAD: PersistPayload = {
  users: [],
  sessionUserId: null,
  reports: []
};

let memoryPayload: PersistPayload = { ...EMPTY_PAYLOAD };

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeUsername(input: string): string {
  return input.trim();
}

function usernameKey(input: string): string {
  return sanitizeUsername(input).toLowerCase();
}

function toSessionUser(user: StoredUser): SessionUser {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  };
}

function normalizePayload(raw: any): PersistPayload {
  const rawUsers: any[] = Array.isArray(raw?.users) ? raw.users : [];
  const users: StoredUser[] = rawUsers
    .filter((item: any) => item && typeof item === "object")
    .map((item: any) => ({
          id: String(item.id || makeId("u")),
          username: String(item.username || ""),
          usernameKey: String(item.usernameKey || usernameKey(String(item.username || ""))),
          password: String(item.password || ""),
          createdAt: String(item.createdAt || nowIso())
        }))
    .filter((item: StoredUser) => Boolean(item.username) && Boolean(item.password));

  const rawReports: any[] = Array.isArray(raw?.reports) ? raw.reports : [];
  const reports: SavedReport[] = rawReports
    .filter((item: any) => item && typeof item === "object")
    .map((item: any) => ({
          id: String(item.id || makeId("r")),
          userId: String(item.userId || ""),
          createdAt: String(item.createdAt || nowIso()),
          input: (item.input || {}) as BirthInput,
          result: (item.result || {}) as BaziResult
        }))
    .filter((item: SavedReport) => Boolean(item.userId) && item.input && item.result);

  const sessionUserId =
    typeof raw?.sessionUserId === "string" && users.some((item) => item.id === raw.sessionUserId)
      ? raw.sessionUserId
      : null;

  return {
    users,
    sessionUserId,
    reports
  };
}

async function readPayload(): Promise<PersistPayload> {
  if (!STORE_URI) {
    return memoryPayload;
  }

  try {
    const info = await FileSystem.getInfoAsync(STORE_URI);
    if (!info.exists) {
      await FileSystem.writeAsStringAsync(STORE_URI, JSON.stringify(EMPTY_PAYLOAD));
      memoryPayload = { ...EMPTY_PAYLOAD };
      return memoryPayload;
    }

    const raw = await FileSystem.readAsStringAsync(STORE_URI);
    const parsed = raw ? JSON.parse(raw) : EMPTY_PAYLOAD;
    const normalized = normalizePayload(parsed);
    memoryPayload = normalized;
    return normalized;
  } catch {
    return memoryPayload;
  }
}

async function writePayload(payload: PersistPayload): Promise<void> {
  memoryPayload = payload;
  if (!STORE_URI) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(STORE_URI, JSON.stringify(payload));
  } catch {
    // keep memory payload as fallback
  }
}

export async function hydrateSession(): Promise<SessionUser | null> {
  const payload = await readPayload();
  if (!payload.sessionUserId) {
    return null;
  }
  const user = payload.users.find((item) => item.id === payload.sessionUserId);
  return user ? toSessionUser(user) : null;
}

export async function registerAccount(username: string, password: string): Promise<SessionUser> {
  const cleanName = sanitizeUsername(username);
  const key = usernameKey(cleanName);
  const cleanPassword = password.trim();

  if (!cleanName) {
    throw new Error("用户名不能为空");
  }
  if (cleanPassword.length < 4) {
    throw new Error("密码至少 4 位");
  }

  const payload = await readPayload();
  if (payload.users.some((item) => item.usernameKey === key)) {
    throw new Error("该用户名已存在，请直接登录");
  }

  const user: StoredUser = {
    id: makeId("u"),
    username: cleanName,
    usernameKey: key,
    password: cleanPassword,
    createdAt: nowIso()
  };
  payload.users = [...payload.users, user];
  payload.sessionUserId = user.id;
  await writePayload(payload);
  return toSessionUser(user);
}

export async function loginAccount(username: string, password: string): Promise<SessionUser> {
  const cleanName = sanitizeUsername(username);
  const key = usernameKey(cleanName);
  const cleanPassword = password.trim();

  if (!cleanName || !cleanPassword) {
    throw new Error("请输入用户名和密码");
  }

  const payload = await readPayload();
  const user = payload.users.find((item) => item.usernameKey === key);
  if (!user || user.password !== cleanPassword) {
    throw new Error("用户名或密码错误");
  }

  payload.sessionUserId = user.id;
  await writePayload(payload);
  return toSessionUser(user);
}

export async function logoutAccount(): Promise<void> {
  const payload = await readPayload();
  payload.sessionUserId = null;
  await writePayload(payload);
}

export async function listReportsForUser(userId: string): Promise<SavedReport[]> {
  const payload = await readPayload();
  return payload.reports
    .filter((item) => item.userId === userId)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function saveReportForUser(userId: string, input: BirthInput, result: BaziResult): Promise<SavedReport> {
  const payload = await readPayload();
  const report: SavedReport = {
    id: makeId("r"),
    userId,
    createdAt: nowIso(),
    input,
    result
  };

  const ownReports = [report, ...payload.reports.filter((item) => item.userId === userId)].slice(0, MAX_REPORTS_PER_USER);
  const otherReports = payload.reports.filter((item) => item.userId !== userId);
  payload.reports = [...otherReports, ...ownReports];
  await writePayload(payload);
  return report;
}

export async function deleteReportForUser(userId: string, reportId: string): Promise<void> {
  const payload = await readPayload();
  payload.reports = payload.reports.filter((item) => !(item.userId === userId && item.id === reportId));
  await writePayload(payload);
}
