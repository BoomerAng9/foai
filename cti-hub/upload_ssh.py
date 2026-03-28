import paramiko
import sys
import time

def upload_file(host, port, username, password, local_path, remote_path):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, port, username, password)
        sftp = client.open_sftp()
        sftp.put(local_path, remote_path)
        sftp.close()
        print("Success")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python upload_ssh.py <local_path> <remote_path>")
        sys.exit(1)
        
    lp = sys.argv[1]
    rp = sys.argv[2]
    host = "76.13.96.107"
    port = 22
    username = "root"
    password = "Ay4BcpKedctPqIifLC'8"
    upload_file(host, port, username, password, lp, rp)
