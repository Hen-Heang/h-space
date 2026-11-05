"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { pushApi, getApiErrorMessage } from "@/lib/api"
import { getUserId } from "@/lib/auth-store"
import {
  disableWebPush,
  enableWebPush,
  getWebPushState,
  isWebPushSupported,
  type WebPushState,
} from "@/lib/push"
import { needsHomeScreenForPush, readPushEnvironment } from "@/lib/push-environment"

export function usePush() {
  const userId = getUserId()
  const queryClient = useQueryClient()
  const telegramKey = useMemo(() => ["telegram-status", userId] as const, [userId])

  const [webState, setWebState] = useState<WebPushState>("disabled")
  const [webBusy, setWebBusy] = useState(false)
  // Read after mount so the server render and the first client render agree.
  const [needsHomeScreen, setNeedsHomeScreen] = useState(false)

  useEffect(() => {
    void getWebPushState().then(setWebState)
    const env = readPushEnvironment()
    setNeedsHomeScreen(env != null && needsHomeScreenForPush(env))
  }, [])

  // Telegram link status (polled while a connect window may be open).
  const { data: telegram } = useQuery({
    queryKey: telegramKey,
    queryFn: () => pushApi.telegramStatus(),
    enabled: userId != null,
  })
  const telegramLinked = !!telegram?.linked

  const enableWeb = useCallback(async () => {
    setWebBusy(true)
    try {
      const next = await enableWebPush()
      setWebState(next)
      if (next === "enabled") toast.success("Browser notifications enabled")
      else if (next === "denied")
        toast.error("Notifications are blocked", {
          description: "Allow them in your browser settings.",
        })
      else if (next === "unsupported")
        toast.error("This browser doesn't support push notifications")
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Could not enable notifications"))
    } finally {
      setWebBusy(false)
    }
  }, [])

  const disableWeb = useCallback(async () => {
    setWebBusy(true)
    try {
      setWebState(await disableWebPush())
      toast.success("Browser notifications disabled")
    } finally {
      setWebBusy(false)
    }
  }, [])

  const sendTest = useCallback(async () => {
    try {
      const result = await pushApi.sendTest()
      if (result.sent > 0) toast.success("Test notification sent")
      else toast.error("No active subscription found — try re-enabling notifications")
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Could not send test notification"))
    }
  }, [])

  const linkTelegram = useCallback(async () => {
    try {
      const { deepLink } = await pushApi.telegramLink()
      if (!deepLink) {
        toast.error("Telegram is not configured on the server.")
        return
      }
      window.open(deepLink, "_blank", "noopener")
      // Poll for the bind to complete after the user taps Start in Telegram.
      let tries = 0
      const id = setInterval(async () => {
        tries++
        const { linked } = await pushApi.telegramStatus()
        if (linked || tries > 20) {
          clearInterval(id)
          if (linked) {
            queryClient.setQueryData(telegramKey, { linked: true })
            toast.success("Telegram connected")
          }
        }
      }, 3000)
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Could not start Telegram linking"))
    }
  }, [queryClient, telegramKey])

  const unlinkTelegram = useCallback(async () => {
    try {
      await pushApi.telegramUnlink()
      queryClient.setQueryData(telegramKey, { linked: false })
      toast.success("Telegram disconnected")
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Could not disconnect Telegram"))
    }
  }, [queryClient, telegramKey])

  const sendTelegramTest = useCallback(async () => {
    try {
      const result = await pushApi.sendTelegramTest()
      if (result.sent > 0) toast.success("Test message sent")
      else toast.error("Telegram isn't linked — try connecting again")
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Could not send test message"))
    }
  }, [])

  return {
    supported: isWebPushSupported(),
    needsHomeScreen,
    webState,
    webEnabled: webState === "enabled",
    webBusy,
    telegramLinked,
    enableWeb,
    disableWeb,
    sendTest,
    linkTelegram,
    unlinkTelegram,
    sendTelegramTest,
  }
}
