import json
from datetime import datetime
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
        if end_min == 0:
            end_min = 24 * 60
        if start_min <= current_min < end_min:
            return slot
    return None

def load_scraped_log(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_html(data):
    scrape_date = data.get('date', 'N/A')
    scrape_time_range = f"{data.get('start_time', 'N/A')} - {data.get('end_time', 'N/A')}"

    rooms = []
    for room, slots in data['room_mappings'].items():
        # Filter out timeslots of 23:59-24:00
        filtered_slots = [slot for slot in slots if slot['timeslot'] != '23:59-24:00' and slot['timeslot'] != '00:00-24:00']

        timeslots = []
        for slot in filtered_slots:
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
        .workflows {{
            color: #555;
            font-size: 0.9rem;
            max-width: 600px;
            margin-top: 1.5rem;
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
            border-radius: 6px;
            box-shadow: 0 1px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        .room-summary {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.5rem;
            cursor: pointer;
            user-select: none;
            font-weight: 700;
            font-size: 1.25rem;
            color: #0078d4;
            background: #e5f1fb;
        }}
        .room-status {{
            font-weight: 600;
            font-style: italic;
            text-transform: capitalize;
            color: #555;
            margin-left: 1rem;
            display: flex;
            align-items: center;
            font-size: 1rem;
        }}
        .room-status.free {{
            color: #188038;
        }}
        .room-status.booked {{
            color: #d13438;
        }}
        .room-status.not-available {{
            color: #999;
        }}
        .timeslot-list {{
            list-style: none;
            padding-left: 1.5rem;
            margin: 0;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            font-size: 0.95rem;
        }}
        .room-item.expanded .timeslot-list {{
            max-height: 1000px; /* big enough to show contents */
            padding-top: 1rem;
            padding-bottom: 1rem;
            overflow: visible;
        }}
        .timeslot-item {{
            border-top: 1px solid #eee;
            padding: 0.5rem 0;
        }}
        .timeslot-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
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
        .timeslot-status.not-available {{
            color: #999;
        }}
        .details {{
            margin-top: 0.4rem;
            color: #444;
            white-space: pre-line;
            display: none;
            padding-left: 1rem;
            font-size: 0.9rem;
        }}
        .timeslot-item.show-details .details {{
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
            margin-bottom: 1.5rem;
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
        <div class="workflows">
            <img src="https://github.com/gongahkia/sagasu-3/actions/workflows/scrape.yml/badge.svg" alt="scrape workflow status" />
            <img src="https://github.com/gongahkia/sagasu-3/actions/workflows/generate.yml/badge.svg" alt="generate workflow status" />
        </div>
        <a class="footer-btn" href="https://github.com/gongahkia/sagasu-3/tree/main/backend/log/scraped_log.json" target="_blank" rel="noopener">
            View the raw scraped_log.json
        </a>
    </div>
    <ul class="room-list">
    {''.join(f'''
        <li class="room-item" id="room-{idx}">
            <div class="room-summary" tabindex="0" role="button" aria-expanded="false" aria-controls="timeslots-{idx}">
                <span class="room-name">{room['room']}</span>
                <span class="room-status" id="room-status-{idx}">Loading...</span>
            </div>
            <ul class="timeslot-list" id="timeslots-{idx}">
                {''.join(f'''
                <li class="timeslot-item" id="room-{idx}-slot-{sidx}">
                    <div class="timeslot-header" tabindex="0" role="button" aria-expanded="false" aria-controls="details-{idx}-{sidx}" onclick="toggleDetails(this)" onkeydown="if(event.key==='Enter'||event.key===' '){{event.preventDefault(); toggleDetails(this);}}">
                        <div>
                            <span class="timeslot-time">{slot['timeslot']}</span>
                            <span class="timeslot-status {slot['status'].replace(' ', '-')}">{slot['status'].replace('not available due to timeslot', 'not available')}</span>
                        </div>
                        {f'<button class="toggle-btn" aria-label="Toggle Details">Details ▼</button>' if slot['details'].strip() else ''}
                    </div>
                    {f'<div class="details" id="details-{idx}-{sidx}">{slot["details"]}</div>' if slot['details'].strip() else ''}
                </li>
                ''' for sidx, slot in enumerate(room['timeslots']))}
            </ul>
        </li>
    ''' for idx, room in enumerate(rooms))}
    </ul>

<script>
    // Toggle room expansion (show/hide timeslots)
    document.querySelectorAll('.room-summary').forEach(summary => {{
        summary.addEventListener('click', () => {{
            const roomItem = summary.parentElement;
            const expanded = summary.getAttribute('aria-expanded') === 'true';

            if (expanded) {{
                roomItem.classList.remove('expanded');
                summary.setAttribute('aria-expanded', 'false');
            }} else {{
                roomItem.classList.add('expanded');
                summary.setAttribute('aria-expanded', 'true');
            }}
        }});

        // Accessibility: toggle on Enter or Space keys
        summary.addEventListener('keydown', (e) => {{
            if (e.key === 'Enter' || e.key === ' ') {{
                e.preventDefault();
                summary.click();
            }}
        }});
    }});

    // Toggle details in timeslot items
    function toggleDetails(element) {{
        const isExpanded = element.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {{
            element.setAttribute('aria-expanded', 'false');
            element.parentElement.classList.remove('show-details');
        }} else {{
            element.setAttribute('aria-expanded', 'true');
            element.parentElement.classList.add('show-details');
        }}
    }}

    // Determine current local datetime
    const now = new Date();
    // Format as YYYY-MM-DD for date comparison
    const pad = n => n.toString().padStart(2, '0');
    const todayStr = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate());
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Function to convert HH:MM to minutes
    function toMinutes(t) {{
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }}

    // For each room, find current timeslot and update room status in summary
    {''.join(f"""
    (function() {{
        const roomIdx = {idx};
        const timeslots = Array.from(document.querySelectorAll('#timeslots-' + roomIdx + ' .timeslot-item')).map(li => {{
            const timeStr = li.querySelector('.timeslot-time').textContent.trim();
            const statusEl = li.querySelector('.timeslot-status');
            return {{
                timeslot: timeStr,
                status: statusEl.textContent.trim(),
            }};
        }});

        const roomStatusEl = document.getElementById('room-status-' + roomIdx);

        let matchedSlot = null;
        for (const slot of timeslots) {{
            if (slot.timeslot === '23:59-24:00' || slot.timeslot === '00:00-24:00') continue; // ignore boundary slot
            const [start, end] = slot.timeslot.split('-');
            let startMin = toMinutes(start);
            let endMin = toMinutes(end);
            if (endMin === 0) endMin = 24 * 60;

            if (startMin <= currentMinutes && currentMinutes < endMin) {{
                matchedSlot = slot;
                break;
            }}
        }}

        if (matchedSlot === null) {{
            roomStatusEl.textContent = 'No data';
            roomStatusEl.className = 'room-status not-available';
        }} else {{
            roomStatusEl.textContent = matchedSlot.status;
            const cls = matchedSlot.status.toLowerCase().replace(/ /g, '-');
            roomStatusEl.className = 'room-status ' + cls;
        }}
    }})();
    """ for idx, room in enumerate(rooms))}
</script>

</body>
<footer class="custom-footer">
    <div>
        <a href="https://github.com/gongahkia/sagasu-3" class="footer-link">Sagasu 3</a> was made with <span style="color:#e25555;">&#10084;&#65039;</span> by <a href="https://gabrielongzm.com" class="footer-link">Gabriel Ong</a>.
    </div>
</footer>
</html>
"""
    return html

def save_html_file(content, filename='../index.html'):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    data = load_scraped_log('../backend/log/scraped_log.json')
    html_content = generate_html(data)
    save_html_file(html_content)
    print("LOG: Finished generating HTML file at index.html")

if __name__ == '__main__':
    main()