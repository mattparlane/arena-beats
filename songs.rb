require 'nokogiri'
require 'uri'
require 'net/http'
require 'json'
require 'cgi'

songs = %w{
  https://soundcloud.com/corrella/blue-eyed-m-ori
  https://soundcloud.com/user-891984023/poi-e-patea-maori-club
  ...
}

def fetch_song_data(url)
  oembed_url = "https://soundcloud.com/oembed?url=#{URI.encode_www_form_component(url)}"
  puts "Fetching data for: #{url}"

  retries = 0
  max_retries = 5

  begin
    uri = URI(oembed_url)
    response = Net::HTTP.get_response(uri)

    if response.is_a?(Net::HTTPSuccess)
      doc = JSON.parse(response.body)
      title = doc['title']
      author_name = doc['author_name']
      html = doc['html']

      # Extract song name from title
      song_name = title.split(' by ').first

      # Extract song ID from HTML iframe src
      html_decoded = CGI.unescapeHTML(html)
      track_id_match = html_decoded.match(/tracks%2F(\d+)/)
      song_id = track_id_match ? track_id_match[1].to_i : nil

      return {
        name: song_name,
        artist: author_name,
        id: song_id
      }
    else
      raise "HTTP error: #{response.code}"
    end
  rescue => e
    puts "Error: #{e.message}"
    retries += 1
    if retries <= max_retries
      puts "Retrying (#{retries}/#{max_retries})..."
      sleep 1
      retry
    else
      puts "Failed after #{max_retries} attempts"
      return nil
    end
  end
end

song_data = []

songs.each_with_index do |url, index|
  data = fetch_song_data(url)
  song_data << data if data

  puts JSON.pretty_generate(song_data)

  # Sleep between requests (except for the last one)
  sleep 5 unless index == songs.length - 1
end

# Output the results as JSON
puts JSON.pretty_generate(song_data)
File.write('songs.json', JSON.pretty_generate(song_data))
puts "Saved data for #{song_data.length} songs to songs.json"
