import cv2
import socket
import concurrent.futures
import os
import subprocess
import re

# ==========================================
# 1. LOCAL CAMERA CONFIGURATION
# ==========================================
SUBNET = "192.168.29"
TARGET_MAC = "5c:35:48:d3:83:61" # Your exact camera MAC address

# The most common CP Plus passwords, prioritized with your newly found app codes!
PASSWORD_GUESSES = [
    "AbFjo071tp",       # The User Code from the EzyKam App (Highly Likely)
    "becde322772177",   # The Device ID from the App
    "soumeet@132006",
    "admin",
    "admin123",
    "123456",
    "888888",
    "",              
    "5c3548d38361",  
    "5C3548D38361",  
    "d38361",        
    "D38361"         
]

def ping_ip(ip):
    """Silently pings an IP to force it to show up in the Windows ARP table."""
    subprocess.call(f"ping -n 1 -w 200 {ip}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def hunt_mac_address():
    # Convert MAC to Windows format (hyphens instead of colons)
    win_mac = TARGET_MAC.lower().replace(':', '-')
    
    print(f"[*] Sweeping network {SUBNET}.* to wake up devices...")
    ips_to_check = [f"{SUBNET}.{i}" for i in range(2, 255) if i != 54]
    
    # Rapidly ping all 250 IPs in 2 seconds
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        executor.map(ping_ip, ips_to_check)

    print(f"[*] Searching Windows ARP table for MAC: {win_mac}...")
    try:
        output = subprocess.check_output("arp -a", shell=True).decode()
        for line in output.split('\n'):
            if win_mac in line.lower():
                # We found the MAC! Now extract the IP address next to it
                ip = re.search(r'\d+\.\d+\.\d+\.\d+', line)
                if ip:
                    print(f"\n[★★★] TARGET ACQUIRED: Camera is at IP {ip.group()} [★★★]")
                    return ip.group()
    except Exception as e:
        print(f"Error reading ARP table: {e}")
        
    return None

def crack_password(ip):
    print(f"\n[!] Attempting to open video stream on {ip}...")
    
    # Check common RTSP ports in case CP Plus hid it on a non-standard port
    COMMON_PORTS = [554, 8554, 8000, 10554, 8899]
    open_port = None
    
    for port in COMMON_PORTS:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        if sock.connect_ex((ip, port)) == 0:
            open_port = port
            sock.close()
            break
        sock.close()

    if not open_port:
        print(f"\n[X] CRITICAL ERROR: The camera is online at {ip}, but ALL standard video ports are CLOSED.")
        print("This confirms the EzyKam App has strictly disabled third-party video access.")
        print("You MUST find the 'ONVIF', 'PC View', or 'Local Network' switch in the mobile app and turn it on.")
        return None, None
        
    print(f"\n[✓] Video Port {open_port} is OPEN! Starting password crack...")

    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "timeout;2000000"
    
    for pwd in PASSWORD_GUESSES:
        print(f"[*] Trying password: '{pwd}' on port {open_port}...")
        url = f"rtsp://admin:{pwd}@{ip}:{open_port}/cam/realmonitor?channel=1&subtype=1"
        
        cap = cv2.VideoCapture(url)
        if cap.isOpened():
            ret, _ = cap.read()
            if ret:
                print(f"\n[★★★] SUCCESS! PASSWORD FOUND: '{pwd}' [★★★]")
                return pwd, cap
        cap.release()
        
    return None, None

def start_local_feed():
    # Step 1: Hunt down the MAC address
    CAMERA_IP = hunt_mac_address()
    
    if not CAMERA_IP:
        print("\n[X] The camera MAC address was not found on the Jio network.")
        print("Please ensure the camera is plugged in, turned on, and connected to the 2.4GHz Jio Wi-Fi.")
        return

    # Step 2: Auto-crack the password
    found_password, cap = crack_password(CAMERA_IP)
    
    if not found_password:
        return

    print("SUCCESS! Local Stream Active. Ready for AI.")
    
    # Step 3: Show the video
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Stream disconnected.")
            break
            
        cv2.imshow("CP Plus Local AI Feed", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    start_local_feed()