import { AdminBlog } from "@/components/admin/admin-blog";
import { listAllPosts } from "@/lib/services/blog";

export default async function AdminBlogPage() {
  const posts = await listAllPosts();
  return <AdminBlog posts={posts} />;
}
