.PHONY: demo-reset demo-verify

demo-reset:
	docker compose exec server python -m app.scripts.reset_mvp_demo --confirm

demo-verify:
	docker compose exec server python -m app.scripts.verify_mvp_demo
