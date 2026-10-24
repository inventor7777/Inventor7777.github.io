---
title: "How I got a Linux root shell on my TRENDnet switch"
excerpt: "Works on stock firmware but isn't the most user friendly."
---
Did you know that you can run arbitrary linux commands on a TRENDnet switch, like my TEG-3102WS, with no firmware modifications?

If that gives you unreasonable amounts of excitement, you're in the right spot. Let's start by doing a quick investigation into what device we are dealing with here.

## The unsuspecting target

Is my TRENDnet TEG-3102WS. It is a great switch for a home server setup. So far, it's reliable, fast, and I honestly cannot fault it for anything. However, it is my first and only managed switch, so I have nothing to compare it to. It had been working perfectly for 60 days straight, but I was highly dissatisfied with the vendor CLI and I yearned for Linux access.

## So, the investigation started

I grabbed a copy of the latest firmware from TRENDnet's website, and GPT 6.1 Sol got to work examining it. 

| Component | Finding |
|---|---|
| Kernel | **Linux 3.18.24** |
| Platform | Realtek **RTL9300 family** |
| CPU architecture | 32-bit big-endian MIPS, MIPS32r2 |
| Userland | BusyBox **1.20.2**, uClibc |
| Shell | `/bin/sh` and `/bin/ash`, both BusyBox |
| Switch application | Proprietary `/bin/Mercury.snos` |
| SSH server | Dropbear **2022.83** |

## Mercury.snos??

Mercury.snos sounded super weird, and after researching briefly, it *appears* to be Senao Networks’ SNOS software, customized for TRENDnet.

Senao’s published datasheet explicitly expands **SNOS as “Supervisory Network Operating System”** and describes it as its Ethernet switch software, including smart/L2/L2+ protocol stacks. [Official datasheet](https://static.engeniuscdn.com/wp-content/uploads/2024/05/06150026/SND12000-Datasheet.pdf.pdf)

The actual binary itself also contains stuff like:
- Functions named `Senao_RESTful_DelInfAddr`, `SENAO_CGI_URL`, and `senao_non_rtl_phy_info`.
- Build paths beginning `/home/emplus/iss-slave/ISS-Switch/trendnet/TPE-3102WS/Realtek/`.
- References to Realtek SDK **3.6.6.55087**.

Together, those strongly indicate **Senao/Emplus switch software built on Realtek’s SDK**, with TRENDnet customization. `Mercury` seems to be the executable’s internal project name. On my switch, that software runs as a privileged application above Linux, and not as a particularly noteworthy one either - it runs in userspace and is started by `/etc/rc`. Its packet filter decides which traffic reaches Linux’s `tap0` interface.

## Running Linux commands

Here is the interesting part you came for. On my switch, this functionality was enabled by default on the stock firmware`1.00.14` and the updated `1.00.16`.

To begin, SSH into the switch normally, and once you're at the prompt, hit Ctrl+Space to send a `NUL` byte, then type exactly `Super@16` (input will be hidden while you type). When you hit enter, the switch prints `<Super Level>` and elevates you to Privilege 16, a hidden super privilege that allows you to use TRENDnet's debugging commands. The relevant one, however, is `dbg_linuxsh`. Inspecting its code shows it constructs:

```text
%s > /tmp/linux_cmd_show.txt
```

and invokes `/bin/sh` with `-c`, then reads the output file.

And it works great.

```
TEG-3102WS# 

<Super Level>
TEG-3102WS# dbg_linuxsh "uptime"

 19:04:58 up 1 day,  2:54,  load average: 0.76, 0.70, 0.68
TEG-3102WS# dbg_linuxsh "uname -a"

Linux trendnet 3.18.24 #4 Thu Jan 16 08:54:56 CST 2025 mips GNU/Linux
TEG-3102WS# 
```

However, this is still pretty cumbersome. This can be solved in two different ways.

## 1. Start a temporary tunnel that resets on reboot.

These are the steps we used on **stock v1.00.14**. The added key lives in RAM and disappears on reboot.

1. On your computer, display your public key, then connect to the switch:

   ```sh
   cat ~/.ssh/id_ed25519.pub
   ssh admin@SWITCH-IP
   ```

2. At the switch CLI, press **Ctrl+Space** (sends a NUL character). At the hidden password prompt, enter:

   ```text
   Super@16
   ```

   This unlocks the privileged CLI containing `dbg_linuxsh`.

3. Add your public key. Replace the entire example key below with the output from step 1:

   ```text
   dbg_linuxsh "mkdir -p /.ssh; chmod 700 /.ssh; echo 'ssh-ed25519 YOUR_PUBLIC_KEY your-comment' >> /.ssh/authorized_keys; chmod 600 /.ssh/authorized_keys"
   ```

4. In a separate terminal on your computer, open a tunnel through the normal admin SSH service:

   ```sh
   ssh -N -L 127.0.0.1:18022:127.0.0.1:8022 admin@SWITCH-IP
   ```

   Leave it running. In another terminal, connect to the existing root Dropbear service:

   ```sh
   ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes -p 18022 root@127.0.0.1
   ```

You now have an interactive root shell. Stock firmware blocks direct network access to 8022, so the tunnel is necessary in order to get to Dropbear.

The temporary login disappears on reboot, but any persistent changes you make from the root shell can remain.

## 2. Build custom firmware

I don't plan to share the exact methods my AI used to rebuild the firmware, as it will be wildly different between devices and firmware versions. However, any recent frontier AI model should be able to help you, if you decide that you'd like to try.

Basically, we changed exactly **three files** in the stock firmware image:

1. **`/bin/Mercury.snos`** — patched ten MIPS instruction words so its existing IPv4 packet filter admits TCP **8022**, alongside port 22. This makes the existing root Dropbear service reachable directly.
2. **`/etc/dropbear/ssh_tunnel_client_rsa.pub`** — added my Mac’s **Ed25519 public key**. The existing boot script copies it into root’s `/.ssh/authorized_keys`. The filename says RSA, but its contents are my Ed25519 key.
3. **`/etc/dropbear/dropbear_rsa_host_key`** — replaced the stock shared SSH server private key with a unique RSA host key for my switch.

We then repacked the image and recalculated its checksums. Boot scripts, kernel code, and bootloader were unchanged.

IPv6 access to that port wasn’t enabled, I didn't want to risk changing too much in the MIPS code and bricking my switch.

With just those changes, it works great, and I can SSH in just like on any other Linux machine.

```
inventor7777@Mac-Studio - 20:17 ~ % ssh -p 8022 root@192.168.50.250












        Welcome to Layer 2 Managed Switch












  Press <Enter> to continue...
~ # uname -a
Linux trendnet 3.18.24 #4 Thu Jan 16 08:54:56 CST 2025 mips GNU/Linux
```
*(Is that much whitespace really needed??)*


A fact you might find interesting: at least on my switch, there's no hostname at all by default. I've SSHed into a lot of things and I haven't seen that one before.