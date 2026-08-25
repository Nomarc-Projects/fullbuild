import type { Metadata } from "next";
import { AboutUs } from "./about-us";

export const metadata: Metadata = {
  title: "About Us — Nomarc Projects",
  description:
    "Nomadic Architects is building Nigeria's leading construction marketplace — connecting verified architects, engineers, quantity surveyors, material suppliers and buyers through a modern digital platform.",
  keywords: [
    "Nigeria construction marketplace", "AEC Nigeria", "architects Nigeria",
    "engineers Nigeria", "quantity surveyors", "construction professionals",
    "material suppliers Nigeria", "Nomadic Architects", "Nomarc Projects",
  ],
  openGraph: {
    title: "About Us — Nomarc Projects",
    description:
      "Learn how Nomadic Architects is building Nigeria's construction marketplace — connecting professionals, exhibitors and buyers through a modern digital platform.",
    url: "https://www.nomarcprojects.com/about",
    siteName: "Nomarc Projects",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us — Nomarc Projects",
    description:
      "Nigeria's leading construction marketplace connecting architects, engineers, quantity surveyors, material suppliers and buyers.",
  },
};

export default function AboutPage() {
  return <AboutUs />;
}
