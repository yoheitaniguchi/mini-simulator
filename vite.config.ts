import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // PRプレビュー（gh-pages branchのpr-preview/pr-<番号>/配下）でも資産パスが解決できるよう、
  // BASE_PATH環境変数があればそれを優先する（.github/workflows/pr-preview.yml参照）
  base: process.env.BASE_PATH ?? "/mini-simulator/",
  plugins: [react()],
});
