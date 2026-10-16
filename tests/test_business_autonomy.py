import unittest

import site_server
from agent import brand_voice
from agent import rag_store


class BusinessAutonomyTest(unittest.TestCase):
    def setUp(self):
        site_server.ensure_schema()

    def test_generate_offer_set_has_product_and_gate(self):
        offers = site_server.generate_offer_set()
        self.assertIn("items", offers)
        self.assertGreaterEqual(len(offers["items"]), 2)
        self.assertTrue(all("price" in item for item in offers["items"]))
        self.assertGreaterEqual(offers["gate"]["threshold"], 10)

    def test_build_journey_room_returns_usable_experience(self):
        room = site_server.build_journey_room("drift-2")
        self.assertEqual(room["room_id"], "drift-2")
        self.assertTrue(room["headline"])
        self.assertTrue(room["cta"])
        self.assertGreaterEqual(len(room["signals"]), 3)

    def test_queue_seo_refresh_creates_job(self):
        result = site_server.queue_seo_refresh("modern-art")
        self.assertEqual(result["status"], "queued")
        self.assertTrue(result["id"] is not None)
        jobs = site_server.fetch_seo_jobs()
        self.assertTrue(any(job["topic"] == "modern-art" for job in jobs))

    def test_brand_voice_prompt_matches_cyberpunk_corporate_tone(self):
        prompt = brand_voice.build_prompt(
            "landing_page",
            "quiet apocalypse growth loop",
            "cyberpunk corporate motivational",
        )
        self.assertIn("cyberpunk", prompt.lower())
        self.assertIn("corporate", prompt.lower())

    def test_rag_store_can_index_and_search(self):
        rag_store.ensure_schema()
        rag_store.add_document(
            "ghost-signal",
            "cyberpunk corporate motivationals about attention, drift, and weird momentum.",
        )
        result = rag_store.search("cyberpunk growth attention")
        self.assertTrue(result)
        self.assertTrue(any("cyberpunk" in item["text"].lower() for item in result))


if __name__ == "__main__":
    unittest.main()
