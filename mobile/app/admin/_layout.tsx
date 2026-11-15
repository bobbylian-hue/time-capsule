import React from "react";
import { Slot } from "expo-router";
import { AdminShell } from "../../src/features/admin/AdminShell";
export default function AdminLayout() {
  return <AdminShell><Slot /></AdminShell>;
}
