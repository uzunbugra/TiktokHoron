"""Translate TikTokLive events into the local Horon event contract."""
from __future__ import annotations

import argparse
import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Any

import httpx


LOG = logging.getLogger("horon.tiktok")
COMMANDS = {"!katil", "!cik", "!sol", "!sag", "!sağ", "!cok", "!çök", "!kalk",
            "!dalga", "!ates", "!ateş", "🔥", "!tempo"}


def _first_value(obj: object | None, *names: str) -> Any:
    for name in names:
        value = getattr(obj, name, None)
        if value not in (None, "", 0):
            return value
    return None


def _identity(event: object) -> tuple[str, str] | None:
    user = getattr(event, "user", None)
    stable_id = _first_value(user, "id", "user_id", "unique_id", "display_id")
    if stable_id is None:
        return None
    nickname = _first_value(user, "nickname", "unique_id", "display_id") or str(stable_id)
    return str(stable_id), str(nickname)[:32]


def _message_id(event: object, *fallbacks: str) -> str | None:
    common = getattr(event, "common", None)
    value = _first_value(common, "msg_id", "message_id") or _first_value(event, *fallbacks)
    return str(value) if value is not None else None


def normalize_comment(event: object) -> dict[str, Any] | None:
    """Return a normalized join/leave command, ignoring ordinary chat."""
    identity = _identity(event)
    message_id = _message_id(event)
    text = str(_first_value(event, "comment", "content") or "").strip()
    command = text.casefold().split(maxsplit=1)[0] if text else ''
    if identity is None or message_id is None or command not in COMMANDS:
        return None
    user_id, nickname = identity
    return {
        "event_id": f"tiktok:comment:{message_id}",
        "type": "comment",
        "user_id": user_id,
        "nickname": nickname,
        "text": text,
    }


def normalize_gift(event: object) -> dict[str, Any] | None:
    """Emit one event per completed gift, never an intermediate streak frame."""
    gift = getattr(event, "gift", None)
    identity = _identity(event)
    if gift is None or identity is None or bool(getattr(event, "streaking", False)):
        return None

    message_id = _message_id(event, "order_id", "log_id")
    gift_id = _first_value(event, "gift_id") or _first_value(gift, "id", "gift_id")
    if message_id is None or gift_id is None:
        return None

    user_id, nickname = identity
    return {
        "event_id": f"tiktok:gift:{message_id}",
        "type": "gift",
        "user_id": user_id,
        "nickname": nickname,
        "gift_id": str(gift_id),
        "count": max(1, int(getattr(event, "repeat_count", 1) or 1)),
        "diamonds": max(0, int(getattr(gift, "diamond_count", 0) or 0)),
    }


@dataclass(frozen=True)
class AdapterConfig:
    unique_id: str
    api_url: str = "http://127.0.0.1:8000"
    admin_token: str = "local-dev-token"
    retry_initial: float = 2.0
    retry_max: float = 60.0


class EventSender:
    def __init__(self, config: AdapterConfig):
        self._config = config
        self._client = httpx.AsyncClient(base_url=config.api_url, timeout=10)

    async def close(self) -> None:
        await self._client.aclose()

    async def send(self, payload: dict[str, Any], attempts: int = 5) -> bool:
        delay = 0.5
        for attempt in range(attempts):
            try:
                response = await self._client.post(
                    "/events",
                    json=payload,
                    headers={"x-admin-token": self._config.admin_token},
                )
                response.raise_for_status()
                return bool(response.json().get("applied"))
            except (httpx.TransportError, httpx.TimeoutException) as exc:
                if attempt == attempts - 1:
                    raise
                LOG.warning("Backend ulaşılamadı (%s); %.1f sn sonra yeniden denenecek", exc, delay)
                await asyncio.sleep(delay)
                delay = min(delay * 2, 8)
        return False


async def _run_connection(config: AdapterConfig, sender: EventSender) -> None:
    try:
        from TikTokLive import TikTokLiveClient
        from TikTokLive.events import CommentEvent, ConnectEvent, DisconnectEvent, GiftEvent
    except ImportError as exc:  # pragma: no cover - exercised only in a broken runtime
        raise RuntimeError("TikTokLive kurulu değil; backend gereksinimlerini yeniden kurun") from exc

    client = TikTokLiveClient(unique_id=config.unique_id)

    @client.on(ConnectEvent)
    async def on_connect(event: object) -> None:
        LOG.info("TikTok LIVE bağlandı: @%s (oda %s)", config.unique_id, getattr(event, "room_id", "?"))

    @client.on(DisconnectEvent)
    async def on_disconnect(_: object) -> None:
        LOG.warning("TikTok LIVE bağlantısı kesildi")

    @client.on(CommentEvent)
    async def on_comment(event: object) -> None:
        payload = normalize_comment(event)
        if payload is not None:
            await sender.send(payload)

    @client.on(GiftEvent)
    async def on_gift(event: object) -> None:
        payload = normalize_gift(event)
        if payload is not None:
            await sender.send(payload)

    try:
        await client.connect(fetch_gift_info=True)
    finally:
        # TikTokLive 7.x's synchronous close helper owns its own loop. We are
        # already inside asyncio here, so close the underlying HTTP session.
        await client.web.close()


async def run_forever(config: AdapterConfig) -> None:
    sender = EventSender(config)
    delay = config.retry_initial
    try:
        while True:
            try:
                await _run_connection(config, sender)
                LOG.warning("TikTok LIVE akışı sona erdi")
            except asyncio.CancelledError:
                raise
            except Exception:
                LOG.exception("TikTok LIVE bağlantı hatası")
            LOG.info("%.1f sn sonra yeniden bağlanılacak", delay)
            await asyncio.sleep(delay)
            delay = min(delay * 2, config.retry_max)
    finally:
        await sender.close()


def parse_args() -> AdapterConfig:
    parser = argparse.ArgumentParser(description="TikTok LIVE olaylarını Horon backend'ine aktar")
    parser.add_argument("unique_id", help="Yayıncının @ kullanıcı adı")
    parser.add_argument("--api-url", default=os.environ.get("HORON_API_URL", "http://127.0.0.1:8000"))
    parser.add_argument("--admin-token", default=os.environ.get("ADMIN_TOKEN", "local-dev-token"))
    args = parser.parse_args()
    return AdapterConfig(unique_id=args.unique_id.lstrip("@"), api_url=args.api_url, admin_token=args.admin_token)


def main() -> None:
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(message)s")
    try:
        asyncio.run(run_forever(parse_args()))
    except KeyboardInterrupt:
        LOG.info("TikTok adaptörü durduruldu")


if __name__ == "__main__":
    main()
