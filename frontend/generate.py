import json
from datetime import datetime, time
import os

def to_minutes(time_str):
    h, m = map(int, time_str.split(":"))
    return h * 60 + m

def current_minutes():
    now = datetime.now()
    return now.hour * 60 + now.minute

def find_current_timeslot(timeslots, current_min):
    """
    Given a list of timeslots (dicts with 'timeslot' field like '08:00-18:00'),
    return the one covering current_min (in minutes).
    """
    for slot in timeslots:
        start_str, end_str = slot['timeslot'].split('-')
        start_min = to_minutes(start_str)
        end_min = to_minutes(end_str)
        # Handle the edge case for 23:59-24:00 as 1439-1440 minutes
        if end_min == 0:
            end_min = 24 * 60
        if start_min <= current_min < end_min:
            return slot
    return None

def load_scraped_log(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_html(data):
    # We won't filter by current time anymore; show all rooms and all timeslots.

    scrape_date = data.get('date', 'N/A')
    scrape_time_range = f"{data.get('start_time', 'N/A')} - {data.get('end_time', 'N/A')}"

    # Prepare rooms with all timeslots
    rooms = []
    for room, slots in data['room_mappings'].items():
        timeslots = []
        for slot in slots:
            # Use custom message for empty details if free
            details_text = slot.get('details', '')
            if slot['status'] == 'free' and not details_text.strip():
                details_text = 'Room is free and available.'

            timeslots.append({
                'timeslot': slot['timeslot'],
                'status': slot['status'],
                'details': details_text,
            })

        rooms.append({
            'room': room,
            'timeslots': timeslots
        })

    # Generate HTML - each room as a block, timeslots as sub-items
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sagasu 3</title>
    <link rel="icon" type="image/x-icon" href="three_logo.ico" />
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
                         Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            margin: 0; padding: 1rem; background: #f9f9f9; color: #222;
        }}
        h1 {{
            font-weight: 600;
            margin-bottom: 0.25em;
        }}
        .meta {{
            color: #555;
            font-size: 0.9rem;
            margin-bottom: 1.5rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }}
        .meta-header {{
            margin-bottom: 1.5rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }}
        .room-list {{
            list-style: none;
            padding: 0;
            max-width: 700px;
            margin: auto;
        }}
        .room-item {{
            background: #fff;
            margin-bottom: 1.5rem;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            box-shadow: 0 1px 8px rgba(0,0,0,0.1);
        }}
        .room-name {{
            font-size: 1.25rem;
            font-weight: 700;
            color: #0078d4;
            margin-bottom: 0.75rem;
        }}
        .timeslot-list {{
            list-style: none;
            padding-left: 0;
        }}
        .timeslot-item {{
            border-top: 1px solid #eee;
            padding: 0.5rem 0;
            font-size: 0.95rem;
        }}
        .timeslot-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }}
        .timeslot-time {{
            font-weight: 600;
            color: #333;
        }}
        .timeslot-status {{
            font-weight: 600;
            color: #555;
            font-style: italic;
            text-transform: capitalize;
            margin-left: 1rem;
        }}
        .timeslot-status.free {{
            color: #188038;
        }}
        .timeslot-status.booked {{
            color: #d13438;
        }}
        .timeslot-status["not available due to timeslot"] {{
            color: #999;
        }}
        .details {{
            margin-top: 0.4rem;
            font-size: 0.9rem;
            color: #444;
            white-space: pre-line;
            display: none;
            padding-left: 1rem;
        }}
        .show .details {{
            display: block;
        }}
        .toggle-btn {{
            font-size: 0.8rem;
            background: #0078d4;
            border: none;
            border-radius: 4px;
            color: white;
            padding: 0.1em 0.5em;
            cursor: pointer;
            user-select: none;
            transition: background 0.2s ease;
            margin-left: 1rem;
        }}
        .toggle-btn:hover {{
            background: #005a9e;
        }}
        .custom-footer {{
            margin: 3rem auto 0 auto;
            max-width: 800px;
            padding: 2rem 1rem 1.5rem 1rem;
            text-align: center;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 1rem;
        }}
        .footer-link {{
            color: #0078d4;
            text-decoration: none;
            font-weight: 600;
        }}
        .footer-link:hover {{
            text-decoration: underline;
            color: #005a9e;
        }}
        .footer-btn {{
            display: inline-block;
            margin-top: 1.2rem;
            margin-bottom: 1.2rem;
            padding: 0.7em 1.8em;
            font-size: 0.90rem;
            font-weight: 600;
            border-radius: 4px;
            background: #0078d4;
            color: #fff;
            text-decoration: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.07);
            border: none;
            transition: background 0.2s, box-shadow 0.2s;
        }}
        .footer-btn:hover, .footer-btn:focus {{
            background: #005a9e;
            color: #fff;
            box-shadow: 0 4px 12px rgba(0,50,150,0.09);
        }}
    </style>
</head>
<body>
    <div align="center">
        <h1 class="meta-header">SMU FBS Room Availability</h1>
        <div class="meta"><strong>Scrape Date:</strong> {scrape_date} | <strong>Time Range:</strong> {scrape_time_range}</div>
        <a class="footer-btn" href="https://github.com/gongahkia/sagasu-3/tree/main/backend/log/scraped_log.json" target="_blank" rel="noopener">
            View the raw scraped_log.json
        </a>
    </div>
    <ul class="room-list">
    {''.join(f'''
        <li class="room-item" id="room-{idx}">
            <div class="room-name">{room['room']}</div>
            <ul class="timeslot-list">
                {''.join(f'''
                <li class="timeslot-item" id="room-{idx}-slot-{sidx}">
                    <div class="timeslot-header" onclick="toggleDetails({idx}, {sidx})" role="button" tabindex="0" aria-expanded="false">
                        <div>
                            <span class="timeslot-time">{slot['timeslot']}</span>
                            <span class="timeslot-status {slot['status'].replace(' ', '-')}">{slot['status'].replace('not available due to timeslot', 'not available')}</span>
                        </div>
                        {f'<button class="toggle-btn" aria-label="Toggle Details">Details ▼</button>' if slot['details'].strip() else ''}
                    </div>
                    {f'<div class="details">{slot["details"]}</div>' if slot['details'].strip() else ''}
                </li>
                ''' for sidx, slot in enumerate(room['timeslots']))}
            </ul>
        </li>
    ''' for idx, room in enumerate(rooms))}
    </ul>

    <script>
        function toggleDetails(roomIdx, slotIdx) {{
            const slotId = 'room-' + roomIdx + '-slot-' + slotIdx;
            const slotItem = document.getElementById(slotId);
            const header = slotItem.querySelector('.timeslot-header');
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            if (isExpanded) {{
                header.setAttribute('aria-expanded', 'false');
                slotItem.classList.remove('show');
            }} else {{
                header.setAttribute('aria-expanded', 'true');
                slotItem.classList.add('show');
            }}
        }}

        // Keyboard accessibility for timeslot headers
        document.querySelectorAll('.timeslot-header').forEach(header => {{
            header.addEventListener('keydown', e => {{
                if (e.key === 'Enter' || e.key === ' ') {{
                    e.preventDefault();
                    header.click();
                }}
            }});
        }});
    </script>
</body>
<footer class="custom-footer">
    <div>
        <a href="https://github.com/gongahkia/sagasu-3" class="footer-link">Sagasu 3</a> was made with <span style="color:#e25555;">&#10084;&#65039;</span> by <a href="https://gabrielzmong.com" class="footer-link">Gabriel Ong</a>.
    </div>
</footer>
</html>
"""
    return html

def save_html_file(content, filename='available_rooms.html'):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    data = load_scraped_log('../backend/log/scraped_log.json')
    html_content = generate_html(data)
    save_html_file(html_content)
    print("LOG: Finished generating HTML file at available_rooms.html")

if __name__ == '__main__':
    main()
