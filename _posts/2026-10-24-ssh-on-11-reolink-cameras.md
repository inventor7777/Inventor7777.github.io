---
title: "My Reolink cameras didn't have SSH, so I fixed that (In one day)"
excerpt: "Why leave a Linux shell hidden inside a camera?"
---

I have 11 Reolink cameras of various models, all PoE. They each record to their own 256GB high endurance microSD card. They were easy to set up, never have any problems, the video quality is phenomenal...but they have Linux with no SSH. TERRIBLE!

## The first attempt

I `nmap`ed the cameras shortly after I got them, just out of curiosity. Unfortunately for me, but fortunately for security, the only exposed services were the ones I had enabled in the Server Settings on each camera. "Well, that sucks.", I thought. That was all I really did to the cameras for quite a few months. 

## I come back with unearned confidence

Recently, I got easy Linux access on my TRENDnet switch, which you can read about [here](https://inventor7777.github.io/blog/2026/10/22/linux-access-on-trendnet/) if you wish. So I decided to take the same approach and see what I could do. I decided to start on the RLC-840A, which seems to be a mid-high end *(as far as Reolink goes)* domed PoE camera. I grabbed the firmware from [Reolink's firmware downloads](https://reolink.com/us/download-center/) and had GPT-6.1 Sol look for any exposed Linux shell. 

After analyzing, the conclusion is that it's pretty secure as far as IoT devices go. The camera's startup script checks whether `/mnt/para/system.cfg` contains `REOCYP`. If it does, the camera starts a login prompt on UART `ttyS0`, at 115200 baud. That is pretty cool that it enables that by default, which could be helpful if you don't plan to modify the firmware. Interestingly, a `telnetd` symlink exists, but no actual binaries for ssh or telnet are included. My Linux nerd side says "Impossible!" but I actually think that's pretty reasonable to exclude from consumer firmware.

So stock firmware is a dead end. However, I still hungered for SSH access...

## Firmware it is

I had a spare unused **RLC-840A**, so I decided to try creating a firmware for it.

To create the firmware, my AI mostly just added Dropbear into the existing machinery. Really, the complicated part was mostly compiling Dropbear correctly and then repacking everything properly into a Reolink firmware package. I'm not planning to share the exact scripts used as it could differ a lot based on firmware and hardware versions, but I do plan on creating a cleaned up repository with everything me and the AI figured out along the way, if anyone else wants to do something similar. If I do create that repo, I'll drop the link here.

| Change | Purpose |
|---|---|
| Add `/usr/sbin/dropbearmulti` | Static Dropbear SSH server, compiled for that camera’s ARM32 or ARM64 CPU. |
| Add `/root/.ssh/authorized_keys` | Contains my Mac’s public key. |
| Set `/root` and `.ssh` to `0700`, key file to `0600`, owned by root | Ensures SSH accepts the key with appropriate permissions. |
| Add `/etc/init.d/S99zz_SSH` | Starts SSH late in boot, after the persistent configuration storage is mounted. |
| Generate and save a unique host key | Stored at `/mnt/para/dropbear/dropbear_ed25519_host_key`; reused across reboots so each camera keeps its own SSH identity. |
| Increment firmware/version metadata and recalculate checksums | Identifies the custom build and keeps the rebuilt package internally consistent. |

**How it works:** boot runs the new startup script → it creates a host key if missing → starts Dropbear on TCP port 22 → root shell

I was initially worried about a firmware signing mechanism or similar, but the RLC-840A booted and exposed SSH as if that was totally normal!

```
inventor7777@inventor7777s-MacBook-Pro - 18:15 ~ % ssh root@192.168.50.30
BAICHUAN Linux shell...
root@BAICHUAN:~$ uname -a
Linux BAICHUAN 4.19.91 #1 PREEMPT Mon Mar 10 12:29:22 CST 2025 armv7l GNU/Linux
```

## The Linux bug has bitten

Now that I had SSH access on one camera, I had an insatiable urge to continue to the RLC-1240A, my Duos, and even the doorbells. The process was more or less the same on each camera, the only main differences being Reolink's apparent need to have a different packaging and filesystem layout on *every single* camera model.

## RLC-840A

| Component | Identified |
|---|---|
| CPU target | Novatek NA51089, ARM Cortex-A9 |
| Kernel | Linux 4.19.91 |
| Userspace | Buildroot-based, BusyBox 1.31.1, glibc 2.30 |
| Bootloader | U-Boot 2019.04 |
| Filesystems | Read-only SquashFS inside UBI volumes |

## RLC-1240A

| Component | Identified |
|---|---|
| CPU target | Novatek NT98539A / NS02302, ARM Cortex-A53, ARM64 |
| Kernel | Linux 5.10.168 |
| Userspace | Buildroot-based, BusyBox 1.36.0, glibc 2.35 |
| Bootloader | U-Boot 2021.10 |
| Filesystems | Read-only raw SquashFS, LZO compression, 8 KiB blocks |

## Duo 2V PoE

| Component | Identified |
|---|---|
| CPU target | Novatek NA51055, dual ARM Cortex-A9, ARM32 |
| Kernel | Linux 4.19.91 |
| Userspace | Buildroot-based, BusyBox 1.24.1, glibc 2.29 |
| Bootloader | U-Boot 2019.04 |
| Filesystems | UBIFS inside UBI volumes, LZO compression |

## Duo 3V PoE

| Component | Identified |
|---|---|
| CPU target | Novatek NS02302, ARM Cortex-A53, ARM64 |
| Kernel | Linux 5.10.168 |
| Userspace | Buildroot-based, BusyBox 1.36.0, glibc 2.35 |
| Bootloader | U-Boot 2021.10 |
| Filesystems | Read-only raw SquashFS, XZ compression, 256 KiB blocks |

## Video Doorbell PoE (D340P)

### Now this one gave me some trouble.


| Component | Identified |
|---|---|
| CPU target | Novatek NA51089, ARM Cortex-A9, ARM32 |
| Kernel | Linux 4.19.91 |
| Userspace | Buildroot-based, BusyBox 1.31.1, glibc 2.30 |
| Bootloader | U-Boot 2019.04 |
| Filesystems | UBIFS inside UBI volumes, LZO compression |

Just like I had on every previous camera model, I went to their [universal firmware download site](https://reolink.com/us/download-center/) and searched for D340P. I ended up with this firmware:

```
Product: D340P
Hardware Version: DB_566128M5MP_P
Firmware Version: v3.0.0.6460_2605271496
Updated Date: June 7, 2026
```

That checked out with my doorbell's product and hardware, so we created a firmware based off of that. I then uploaded the resulting file. All seemed well. The web interface reported that the firmware update was complete, and the doorbell even rebooted! However, it rebooted straight back into the original firmware. Apparently, the updater considers successfully refusing an update to be a successful update. 

As it turns out, Reolink has two versions of this doorbell that differ only in firmware.

| Product listing | Latest firmware |
|---|---|
| Reolink Video Doorbell PoE | `6460_2605211898` — the version my doorbell was running |
| D340P | `6460_2605271496` — the firmware I had just downloaded |

- **My doorbell FW:** `offline_product=0`, magic `0x32725913`
- **"D340P" FW:** `offline_product=1`, magic `0x32725923`

I find that infuriating! I personally think they should keep the same firmware and apply a hidden configuration at manufacture time or something! I specifically searched for "D340P" because I figured going by actual model would definitely get me the right firmware, but as it turns out, the correct page is actually for the ["Video Doorbell PoE"](https://support.reolink.com/c/video-doorbell-poe/), and not the ["D340P"](https://support.reolink.com/c/d340p/)

It seems that the initial update had failed because someone at Reolink had thought ahead and added a check in the updater so that it refused to write the wrong version I'd uploaded. So, thanks to them, my doorbell didn't have any issues, it was just confusing, since the updater had confidently claimed a successful update. I only noticed that it hadn't updated when I had no SSH. Sure enough, after logging back in, the FW version was the same as before. That's when I started investigating and found the correct firmware. Once the mods were based on the correct firmware, it worked perfectly as well.

## Closing notes

Looking back, it is kind of insane that this is normal now. Prior to AI, this sort of reverse engineering required a decent bit of experience and without a doubt, some failures on real hardware. But today, I basically one-shotted and deployed 5 firmware update binaries that gave my 11 Reolink cameras native secure SSH, without any modification-related hassle whatsoever, excluding circumstances beyond the reasonable control of the author, including but not limited to misleading product listings and firmware compatibility checks. It's pretty exciting to think about what might happen in the reverse engineering realm as time goes on. 

Aside from the process itself, it was pretty neat to poke around the camera shells for fun. Some facts you might find interesting:

- Some applets are compiled into BusyBox but are not symlinked. For example, `tree`.
- Their version of BusyBox `ls` uses colors by default.
- When using a local SD card, it mounts to `/mnt/sda`. Normal + substream recordings are under `/mnt/sda/Mp4Record`, and timelapses are stored under `/mnt/sda/Mp4TimeLapse`. [I hear that you can even patch NGINX to serve these files directly.](https://github.com/gabest11/reolink_firmware_patcher#nginx)
- The RLC-840As and doorbells use a shell prompt of `\u@\h:\w$`, while the others use `[\u@\h:\w]\$`.
- All of the hostnames are `BAICHUAN`. I wish it would follow the user-selected name, but it's no huge deal.

Overall, I consider this a massive success. I added 11 Linux computers to my arsenal, with no real downsides. My main reason for doing all this was to experiment around and learn some stuff, but there are real benefits: if I need to programmatically access the stored files, change some internal system configuration, or even more weird things, it is pretty trivial to do inside of Linux. My next step is probably going to be compiling some utilities such as tcpdump and putting them on the SD cards.