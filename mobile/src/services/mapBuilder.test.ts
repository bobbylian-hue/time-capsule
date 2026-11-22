import { describe, expect, it, vi } from "vitest";
vi.mock("expo-crypto", () => ({ randomUUID: () => "00000000-0000-4000-8000-000000000000" }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(), setItem: vi.fn() } }));
vi.mock("./supabase", () => ({ supabase: { storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.test/waypost-photos/${p}` } }) }) } } }));
import { photoUrl, sceneFor } from "./mapBuilder";

describe("map builder helpers", () => {
  it("suggests a picture from the kind of place the map names", () => {
    expect(sceneFor("park")).toBe("park");
    expect(sceneFor("pier")).toBe("waterfront");
    expect(sceneFor("artwork")).toBe("publicArt");
    expect(sceneFor("garden")).toBe("garden");
    expect(sceneFor("cafe")).toBe("square");
    expect(sceneFor(null)).toBe("square");
  });
  it("loads a photo from a URL as it is, and a bucket path from the public bucket", () => {
    expect(photoUrl(null)).toBeNull();
    expect(photoUrl("https://x.test/a.jpg")).toBe("https://x.test/a.jpg");
    expect(photoUrl("taipei/abc.jpg")).toBe("https://cdn.test/waypost-photos/taipei/abc.jpg");
  });
});
