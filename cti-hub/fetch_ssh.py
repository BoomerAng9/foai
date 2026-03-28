import paramiko
import sys
import time

def fetch_file(host, port, username, password, remote_path, local_path):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, port, username, password)
        sftp = client.open_sftp()
        sftp.get(remote_path, local_path)
        sftp.close()
        print("Success")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python sftp_script.py <remote_path> <local_path>")
        sys.exit(1)
        
    rp = sys.argv[1]
    lp = sys.argv[2]
    host = "76.13.96.107"
    port = 22
    username = "root"
    password = "Ay4BcpKedctPqIifLC'8"
    fetch_file(host, port, username, password, rp, lp)
