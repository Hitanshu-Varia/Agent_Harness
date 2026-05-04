import sys

def read_chunk(filepath, chunk_size=4000):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
            for i in range(0, len(content), chunk_size):
                print(f"--- Chunk {i//chunk_size + 1} of {len(content)//chunk_size + 1} ---")
                print(content[i:i+chunk_size])
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        read_chunk(sys.argv[1])
    else:
        print("Provide a file path")
